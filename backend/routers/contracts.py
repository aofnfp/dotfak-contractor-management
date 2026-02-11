#!/usr/bin/env python3
"""
Contracts router - CRUD, signing, PDF generation.

Static routes (/pending-signatures) MUST be defined before
the dynamic route (/{contract_id}) to avoid FastAPI matching as an ID.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id, get_manager_id
from backend.services.contract_service import ContractService
from backend.services.email_service import email_service
from backend.schemas.contract import (
    ContractResponse,
    ContractListItem,
    SignContractRequest,
    SignatureResponse,
    GenerateAmendmentRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contracts", tags=["contracts"])


def _enrich_contract(contract: dict) -> dict:
    """Add contractor and client names to a contract record."""
    enriched = dict(contract)

    if contract.get("contractor_id"):
        c = supabase_admin_client.table("contractors").select(
            "first_name, last_name, contractor_code"
        ).eq("id", contract["contractor_id"]).execute()
        if c.data:
            enriched["contractor_name"] = f"{c.data[0]['first_name']} {c.data[0]['last_name']}"
            enriched["contractor_code"] = c.data[0]["contractor_code"]

    if contract.get("manager_id"):
        m = supabase_admin_client.table("managers").select(
            "first_name, last_name"
        ).eq("id", contract["manager_id"]).execute()
        if m.data:
            enriched["manager_name"] = f"{m.data[0]['first_name']} {m.data[0]['last_name']}"

    if contract.get("assignment_id"):
        a = supabase_admin_client.table("contractor_assignments").select(
            "client_company_id"
        ).eq("id", contract["assignment_id"]).execute()
        if a.data:
            cl = supabase_admin_client.table("client_companies").select(
                "name"
            ).eq("id", a.data[0]["client_company_id"]).execute()
            if cl.data:
                enriched["client_name"] = cl.data[0]["name"]

    return enriched


# ============================================================================
# Static routes first (before /{contract_id})
# ============================================================================

@router.get("/pending-signatures", response_model=List[ContractListItem])
async def list_pending_signatures(user: dict = Depends(require_admin)):
    """List contracts awaiting admin signature."""
    try:
        result = supabase_admin_client.table("contracts").select("*").eq(
            "status", "pending_admin"
        ).order("updated_at", desc=True).execute()

        return [_enrich_contract(c) for c in result.data or []]
    except Exception as e:
        logger.error(f"Failed to list pending signatures: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-amendment")
async def generate_amendment(
    data: GenerateAmendmentRequest,
    user: dict = Depends(require_admin),
):
    """Generate a contract amendment for changed terms."""
    try:
        assignment_id = str(data.assignment_id)

        # Find the current fully_executed contract
        existing = supabase_admin_client.table("contracts").select("id").eq(
            "assignment_id", assignment_id
        ).eq("status", "fully_executed").order("version", desc=True).limit(1).execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="No executed contract found for this assignment")

        parent_contract_id = existing.data[0]["id"]

        amendment = ContractService.generate_amendment(
            parent_contract_id=parent_contract_id,
            assignment_id=assignment_id,
            changes={"summary": {"old": "Previous terms", "new": data.changes_summary or "Updated terms"}},
        )

        return _enrich_contract(amendment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate amendment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# List and detail routes
# ============================================================================

@router.get("", response_model=List[ContractListItem])
async def list_contracts(
    status_filter: str = None,
    user: dict = Depends(verify_token),
):
    """List contracts. Admin sees all, contractor sees own."""
    try:
        role = user.get("role")

        if role == "admin":
            query = supabase_admin_client.table("contracts").select("*")
        elif role == "manager":
            manager_id = get_manager_id(user["user_id"])
            if not manager_id:
                return []
            query = supabase_admin_client.table("contracts").select("*").eq(
                "manager_id", manager_id
            )
        else:
            contractor_id = get_contractor_id(user["user_id"])
            if not contractor_id:
                return []
            query = supabase_admin_client.table("contracts").select("*").eq(
                "contractor_id", contractor_id
            )

        if status_filter:
            query = query.eq("status", status_filter)

        result = query.order("created_at", desc=True).execute()

        return [_enrich_contract(c) for c in result.data or []]
    except Exception as e:
        logger.error(f"Failed to list contracts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    user: dict = Depends(verify_token),
):
    """Get contract details with HTML content and signatures."""
    try:
        result = supabase_admin_client.table("contracts").select("*").eq(
            "id", contract_id
        ).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Contract not found")

        contract = result.data[0]

        # Authorization check for non-admin
        role = user.get("role")
        if role == "manager":
            manager_id = get_manager_id(user["user_id"])
            if contract.get("manager_id") != manager_id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role != "admin":
            contractor_id = get_contractor_id(user["user_id"])
            if contract["contractor_id"] != contractor_id:
                raise HTTPException(status_code=403, detail="Access denied")

        enriched = _enrich_contract(contract)

        # Fetch signatures (including signature_data for display in contract view)
        sigs = supabase_admin_client.table("contract_signatures").select(
            "id, signer_type, signer_name, signature_method, signed_at, signature_data"
        ).eq("contract_id", contract_id).execute()

        enriched["signatures"] = sigs.data or []

        return enriched
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get contract: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{contract_id}/sign")
async def sign_contract(
    contract_id: str,
    data: SignContractRequest,
    request: Request,
    user: dict = Depends(verify_token),
):
    """
    Submit a signature for a contract.

    Contractor signs when status is 'pending_contractor'.
    Admin signs when status is 'pending_admin'.
    """
    try:
        # Fetch contract
        result = supabase_admin_client.table("contracts").select("*").eq(
            "id", contract_id
        ).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Contract not found")

        contract = result.data[0]
        role = user.get("role")

        # Determine signer type and validate state
        if role == "admin":
            if contract["status"] != "pending_admin":
                raise HTTPException(status_code=400, detail="Contract is not awaiting admin signature")
            signer_type = "admin"
            signer_id = user["user_id"]
        elif role == "manager":
            if contract["status"] != "pending_contractor":
                raise HTTPException(status_code=400, detail="Contract is not awaiting your signature")
            manager_id = get_manager_id(user["user_id"])
            if contract.get("manager_id") != manager_id:
                raise HTTPException(status_code=403, detail="This contract is not assigned to you")
            signer_type = "contractor"
            signer_id = manager_id
        else:
            if contract["status"] != "pending_contractor":
                raise HTTPException(status_code=400, detail="Contract is not awaiting your signature")
            contractor_id = get_contractor_id(user["user_id"])
            if contract["contractor_id"] != contractor_id:
                raise HTTPException(status_code=403, detail="This contract is not assigned to you")
            signer_type = "contractor"
            signer_id = contractor_id

        # Get IP address
        ip_address = request.client.host if request.client else None

        # Store signature
        supabase_admin_client.table("contract_signatures").insert({
            "contract_id": contract_id,
            "signer_type": signer_type,
            "signer_id": signer_id,
            "signer_name": data.signer_name,
            "signature_data": data.signature_data,
            "signature_method": data.signature_method,
            "ip_address": ip_address,
        }).execute()

        # Advance contract status
        is_manager_contract = contract.get("manager_id") and not contract.get("contractor_id")

        if signer_type == "contractor":
            supabase_admin_client.table("contracts").update({
                "status": "pending_admin"
            }).eq("id", contract_id).execute()

            if is_manager_contract:
                # Manager signed — notify admin
                try:
                    mgr = supabase_admin_client.table("managers").select(
                        "first_name, last_name"
                    ).eq("id", contract["manager_id"]).execute()
                    name = f"{mgr.data[0]['first_name']} {mgr.data[0]['last_name']}" if mgr.data else "Manager"
                    await email_service.send_admin_signature_needed(
                        admin_email=email_service.sender_email,
                        contractor_name=name,
                        dashboard_url="https://dotfak-contractor-management.netlify.app/contracts",
                    )
                except Exception as e:
                    logger.warning(f"Failed to send admin notification: {e}")
            else:
                # Contractor signed
                from backend.services.onboarding_service import OnboardingService
                OnboardingService.advance_onboarding_status(
                    contract["contractor_id"], "contract_signed"
                )

                try:
                    contractor = supabase_admin_client.table("contractors").select(
                        "first_name, last_name"
                    ).eq("id", contract["contractor_id"]).execute()
                    name = f"{contractor.data[0]['first_name']} {contractor.data[0]['last_name']}" if contractor.data else "Contractor"
                    await email_service.send_admin_signature_needed(
                        admin_email=email_service.sender_email,
                        contractor_name=name,
                        dashboard_url="https://dotfak-contractor-management.netlify.app/contracts",
                    )
                except Exception as e:
                    logger.warning(f"Failed to send admin notification: {e}")

        elif signer_type == "admin":
            supabase_admin_client.table("contracts").update({
                "status": "fully_executed"
            }).eq("id", contract_id).execute()

            # Generate PDF
            pdf_url = ContractService.generate_pdf(contract_id)

            if is_manager_contract:
                # Notify manager
                try:
                    mgr = supabase_admin_client.table("managers").select(
                        "first_name, last_name, email"
                    ).eq("id", contract["manager_id"]).execute()
                    if mgr.data and mgr.data[0].get("email"):
                        m = mgr.data[0]
                        await email_service.send_contract_executed(
                            to_email=m["email"],
                            contractor_name=f"{m['first_name']} {m['last_name']}",
                            pdf_url=pdf_url or "https://dotfak-contractor-management.netlify.app/contracts",
                        )
                except Exception as e:
                    logger.warning(f"Failed to send execution notification: {e}")
            else:
                # Update contractor onboarding status
                from backend.services.onboarding_service import OnboardingService
                OnboardingService.advance_onboarding_status(
                    contract["contractor_id"], "fully_onboarded"
                )

                try:
                    contractor = supabase_admin_client.table("contractors").select(
                        "first_name, last_name, email"
                    ).eq("id", contract["contractor_id"]).execute()
                    if contractor.data and contractor.data[0].get("email"):
                        c = contractor.data[0]
                        await email_service.send_contract_executed(
                            to_email=c["email"],
                            contractor_name=f"{c['first_name']} {c['last_name']}",
                            pdf_url=pdf_url or "https://dotfak-contractor-management.netlify.app/contracts",
                        )
                except Exception as e:
                    logger.warning(f"Failed to send execution notification: {e}")

        return {"success": True, "message": f"Contract signed by {signer_type}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to sign contract: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{contract_id}/pdf")
async def get_contract_pdf(
    contract_id: str,
    user: dict = Depends(verify_token),
):
    """Get the PDF URL for a contract."""
    try:
        result = supabase_admin_client.table("contracts").select(
            "id, contractor_id, pdf_url, status"
        ).eq("id", contract_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Contract not found")

        contract = result.data[0]

        # Authorization
        if user.get("role") != "admin":
            contractor_id = get_contractor_id(user["user_id"])
            if contract["contractor_id"] != contractor_id:
                raise HTTPException(status_code=403, detail="Access denied")

        if not contract.get("pdf_url"):
            # Try generating on the fly
            if contract["status"] == "fully_executed":
                pdf_url = ContractService.generate_pdf(contract_id)
                if pdf_url:
                    return {"pdf_url": pdf_url}
            raise HTTPException(status_code=404, detail="PDF not yet available")

        return {"pdf_url": contract["pdf_url"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
