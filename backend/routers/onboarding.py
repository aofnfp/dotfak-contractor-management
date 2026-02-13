#!/usr/bin/env python3
"""
Onboarding router - contractor invitation, account setup, and profile verification.

Public endpoints (no auth): verify-token, setup-account
Admin endpoints: invitations CRUD, status overview
Contractor endpoints: update-profile, complete-profile
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id
from backend.services.onboarding_service import OnboardingService
from backend.services.contract_service import ContractService
from backend.services.email_service import email_service
from backend.schemas.onboarding import (
    InvitationCreate,
    InvitationResponse,
    OnboardingStatusItem,
    VerifyTokenResponse,
    SetupAccountRequest,
    SetupAccountResponse,
    UpdateProfileRequest,
    CompleteProfileResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.post("/invitations", response_model=InvitationResponse)
async def create_invitation(
    data: InvitationCreate,
    user: dict = Depends(require_admin),
):
    """Create an invitation and send email to contractor."""
    try:
        contractor_id = str(data.contractor_id)

        # Validate contractor exists
        contractor = supabase_admin_client.table("contractors").select(
            "id, first_name, last_name, auth_user_id, onboarding_status"
        ).eq("id", contractor_id).execute()

        if not contractor.data:
            raise HTTPException(status_code=404, detail="Contractor not found")

        c = contractor.data[0]

        # Check contractor doesn't already have an auth account
        if c.get("auth_user_id"):
            raise HTTPException(status_code=400, detail="Contractor already has an account")

        # Check contractor has an active assignment
        assignments = supabase_admin_client.table("contractor_assignments").select(
            "id"
        ).eq("contractor_id", contractor_id).eq("is_active", True).execute()

        if not assignments.data:
            raise HTTPException(status_code=400, detail="Contractor has no active assignment")

        # Create invitation
        invitation = OnboardingService.create_invitation(contractor_id, str(data.email))

        # Send email
        contractor_name = f"{c['first_name']} {c['last_name']}"
        invite_url = OnboardingService.get_invite_url(invitation["token"])

        try:
            import asyncio
            await email_service.send_invitation(str(data.email), contractor_name, invite_url)
        except Exception as e:
            logger.warning(f"Failed to send invitation email: {e}")
            # Don't fail the request if email fails - invitation is still created

        # Enrich response
        invitation["contractor_name"] = contractor_name
        invitation["contractor_code"] = None

        return invitation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invitations", response_model=List[InvitationResponse])
async def list_invitations(user: dict = Depends(require_admin)):
    """List all invitations with contractor details."""
    try:
        result = supabase_admin_client.table("contractor_invitations").select(
            "*, contractors(first_name, last_name, contractor_code)"
        ).order("created_at", desc=True).execute()

        invitations = []
        for inv in result.data or []:
            c = inv.pop("contractors", {}) or {}
            inv["contractor_name"] = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or None
            inv["contractor_code"] = c.get("contractor_code")
            invitations.append(inv)

        return invitations
    except Exception as e:
        logger.error(f"Failed to list invitations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: str,
    user: dict = Depends(require_admin),
):
    """Resend invitation email."""
    try:
        inv = supabase_admin_client.table("contractor_invitations").select(
            "*, contractors(first_name, last_name)"
        ).eq("id", invitation_id).eq("status", "pending").execute()

        if not inv.data:
            raise HTTPException(status_code=404, detail="Pending invitation not found")

        invitation = inv.data[0]
        c = invitation.get("contractors", {}) or {}
        contractor_name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        invite_url = OnboardingService.get_invite_url(invitation["token"])

        await email_service.send_invitation(invitation["email"], contractor_name, invite_url)

        return {"success": True, "message": "Invitation resent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resend invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    user: dict = Depends(require_admin),
):
    """Revoke a pending invitation."""
    try:
        result = supabase_admin_client.table("contractor_invitations").update({
            "status": "revoked"
        }).eq("id", invitation_id).eq("status", "pending").execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Pending invitation not found")

        # Reset contractor status
        contractor_id = result.data[0]["contractor_id"]
        supabase_admin_client.table("contractors").update({
            "onboarding_status": "not_invited"
        }).eq("id", contractor_id).execute()

        return {"success": True, "message": "Invitation revoked"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=List[OnboardingStatusItem])
async def get_onboarding_status(user: dict = Depends(require_admin)):
    """Get onboarding status for all contractors."""
    try:
        return OnboardingService.get_all_onboarding_statuses()
    except Exception as e:
        logger.error(f"Failed to get onboarding status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Public Endpoints (no auth required)
# ============================================================================

@router.get("/verify-token/{token}", response_model=VerifyTokenResponse)
async def verify_invitation_token(token: str):
    """Verify an invitation token and return contractor info. No auth required."""
    try:
        data = OnboardingService.verify_token(token)
        if not data:
            return VerifyTokenResponse(valid=False)

        if data["already_has_account"]:
            return VerifyTokenResponse(
                valid=False,
                contractor_id=data["contractor_id"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
            )

        return VerifyTokenResponse(
            valid=True,
            contractor_id=data["contractor_id"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            phone=data.get("phone"),
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            country=data.get("country"),
            zip_code=data.get("zip_code"),
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return VerifyTokenResponse(valid=False)


@router.post("/setup-account", response_model=SetupAccountResponse)
async def setup_account(data: SetupAccountRequest):
    """Create auth account from invitation token. No auth required."""
    try:
        result = OnboardingService.setup_account(data.token, data.password)
        return SetupAccountResponse(
            success=True,
            message="Account created successfully",
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            contractor_id=result["contractor_id"],
        )
    except Exception as e:
        logger.error(f"Account setup failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Contractor Endpoints (authenticated)
# ============================================================================

@router.put("/update-profile")
async def update_profile(
    data: UpdateProfileRequest,
    user: dict = Depends(verify_token),
):
    """Update contractor profile during onboarding."""
    try:
        contractor_id = get_contractor_id(user["user_id"])
        if not contractor_id:
            raise HTTPException(status_code=404, detail="Contractor profile not found")

        update_data = {}
        if data.first_name is not None:
            update_data["first_name"] = data.first_name
        if data.last_name is not None:
            update_data["last_name"] = data.last_name
        if data.phone is not None:
            update_data["phone"] = data.phone
        if data.address is not None:
            update_data["address"] = data.address
        if data.city is not None:
            update_data["city"] = data.city
        if data.state is not None:
            update_data["state"] = data.state
        if data.country is not None:
            update_data["country"] = data.country
        if data.zip_code is not None:
            update_data["zip_code"] = data.zip_code

        if update_data:
            supabase_admin_client.table("contractors").update(
                update_data
            ).eq("id", contractor_id).execute()

        return {"success": True, "message": "Profile updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-profile", response_model=CompleteProfileResponse)
async def complete_profile(
    data: UpdateProfileRequest,
    user: dict = Depends(verify_token),
):
    """
    Mark profile as completed, register bank account, and generate contract.

    This is the final step of profile verification.
    Requires: address, city, state, country.
    """
    try:
        contractor_id = get_contractor_id(user["user_id"])
        if not contractor_id:
            raise HTTPException(status_code=404, detail="Contractor profile not found")

        # Validate required address fields for onboarding completion
        missing = []
        if not data.address:
            missing.append("street address")
        if not data.city:
            missing.append("city")
        if not data.state:
            missing.append("state")
        if not data.country:
            missing.append("country")
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing)}"
            )

        # Apply any final profile updates
        update_data = {}
        if data.first_name is not None:
            update_data["first_name"] = data.first_name
        if data.last_name is not None:
            update_data["last_name"] = data.last_name
        if data.phone is not None:
            update_data["phone"] = data.phone
        if data.address is not None:
            update_data["address"] = data.address
        if data.city is not None:
            update_data["city"] = data.city
        if data.state is not None:
            update_data["state"] = data.state
        if data.country is not None:
            update_data["country"] = data.country
        if data.zip_code is not None:
            update_data["zip_code"] = data.zip_code

        if update_data:
            supabase_admin_client.table("contractors").update(
                update_data
            ).eq("id", contractor_id).execute()

        # Register bank account if provided
        if data.bank_account_last4:
            # Check if account already exists
            existing = supabase_admin_client.table("bank_accounts").select("id").eq(
                "account_last4", data.bank_account_last4
            ).execute()

            if not existing.data:
                # Create new bank account record
                supabase_admin_client.table("bank_accounts").insert({
                    "account_last4": data.bank_account_last4,
                    "owner_type": "contractor",
                    "owner_id": contractor_id,
                    "is_active": True,
                }).execute()
            else:
                # Update owner if unassigned
                account = existing.data[0]
                supabase_admin_client.table("bank_accounts").update({
                    "owner_type": "contractor",
                    "owner_id": contractor_id,
                }).eq("id", account["id"]).execute()

        # Advance onboarding status
        OnboardingService.advance_onboarding_status(contractor_id, "profile_completed")

        # Generate contracts for ALL active assignments (not just the first)
        assignments = supabase_admin_client.table("contractor_assignments").select(
            "id"
        ).eq("contractor_id", contractor_id).eq("is_active", True).execute()

        contract_id = None
        for a in (assignments.data or []):
            try:
                contract = ContractService.generate_contract(contractor_id, a["id"])
                if contract_id is None:
                    contract_id = contract["id"]  # First contract for onboarding step
            except Exception as ce:
                logger.error(f"Failed to generate contract for assignment {a['id']}: {ce}")

        return CompleteProfileResponse(
            success=True,
            message="Profile completed. Contract generated for review.",
            contract_id=contract_id,
            onboarding_status="profile_completed",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
