"""
Manager onboarding router - invitation, account setup, profile verification, and contract signing.

Public endpoints (no auth): verify-token, setup-account
Admin endpoints: invite manager
Manager endpoints: update-profile, complete-profile
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from backend.config import supabase_admin_client, FRONTEND_URL
from backend.dependencies import require_admin, verify_token, get_manager_id
from backend.services.contract_service import ContractService
from backend.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["manager-onboarding"])
INVITATION_EXPIRY_DAYS = 7


# --- Request/Response schemas ---

class ManagerInviteRequest(BaseModel):
    email: str


class ManagerVerifyTokenResponse(BaseModel):
    valid: bool
    manager_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None


class ManagerSetupAccountRequest(BaseModel):
    token: str
    password: str


class ManagerSetupAccountResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    manager_id: Optional[str] = None


class ManagerUpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    bank_account_last4: Optional[str] = None


class ManagerCompleteProfileResponse(BaseModel):
    success: bool
    message: str
    contract_ids: list = []
    onboarding_status: str = "completed"


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.post("/managers/{manager_id}/invite")
async def invite_manager(
    manager_id: str,
    data: ManagerInviteRequest,
    user: dict = Depends(require_admin),
):
    """Send invitation to a manager (admin only)."""
    try:
        # Validate manager exists
        manager = supabase_admin_client.table("managers").select(
            "id, first_name, last_name, auth_user_id, onboarding_status"
        ).eq("id", manager_id).execute()

        if not manager.data:
            raise HTTPException(status_code=404, detail="Manager not found")

        m = manager.data[0]

        if m.get("auth_user_id"):
            raise HTTPException(status_code=400, detail="Manager already has an account")

        # Check manager has at least one active assignment
        assignments = supabase_admin_client.table("manager_assignments").select(
            "id"
        ).eq("manager_id", manager_id).eq("is_active", True).execute()

        if not assignments.data:
            raise HTTPException(status_code=400, detail="Manager has no active assignments")

        # Create invitation token
        token = secrets.token_hex(64)
        expires_at = datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS)

        result = supabase_admin_client.table("manager_invitations").insert({
            "manager_id": manager_id,
            "email": data.email,
            "token": token,
            "invited_by": user["user_id"],
            "expires_at": expires_at.isoformat(),
        }).execute()

        if not result.data:
            raise Exception("Failed to create invitation")

        # Update manager email and status
        supabase_admin_client.table("managers").update({
            "email": data.email,
            "onboarding_status": "invited",
        }).eq("id", manager_id).execute()

        # Send email
        manager_name = f"{m['first_name']} {m['last_name']}"
        invite_url = f"{FRONTEND_URL}/onboard/manager?token={token}"

        try:
            await email_service.send_invitation(data.email, manager_name, invite_url)
        except Exception as e:
            logger.warning(f"Failed to send manager invitation email: {e}")

        return {
            "success": True,
            "message": f"Invitation sent to {data.email}",
            "invitation_id": result.data[0]["id"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invite manager: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/managers/{manager_id}/invite/resend")
async def resend_manager_invitation(
    manager_id: str,
    user: dict = Depends(require_admin),
):
    """Resend the most recent pending invitation email for a manager (admin only)."""
    try:
        # Find the most recent pending invitation for this manager
        inv = supabase_admin_client.table("manager_invitations").select(
            "*, managers(first_name, last_name)"
        ).eq("manager_id", manager_id).is_("accepted_at", "null").order(
            "created_at", desc=True
        ).limit(1).execute()

        if not inv.data:
            raise HTTPException(status_code=404, detail="No pending invitation found for this manager")

        invitation = inv.data[0]

        # Check expiry - if expired, create a new token
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            # Create new invitation token
            token = secrets.token_hex(64)
            new_expires_at = datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS)

            result = supabase_admin_client.table("manager_invitations").insert({
                "manager_id": manager_id,
                "email": invitation["email"],
                "token": token,
                "invited_by": user["user_id"],
                "expires_at": new_expires_at.isoformat(),
            }).execute()

            if not result.data:
                raise Exception("Failed to create new invitation")

            invitation = result.data[0]
            invitation["managers"] = inv.data[0].get("managers")
        else:
            token = invitation["token"]

        m = invitation.get("managers", {}) or {}
        manager_name = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        invite_url = f"{FRONTEND_URL}/onboard/manager?token={token}"

        await email_service.send_invitation(invitation["email"], manager_name, invite_url)

        return {"success": True, "message": f"Invitation resent to {invitation['email']}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resend manager invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Public Endpoints (no auth)
# ============================================================================

@router.get("/onboarding/manager/verify-token/{token}", response_model=ManagerVerifyTokenResponse)
async def verify_manager_token(token: str):
    """Verify a manager invitation token. No auth required."""
    try:
        result = supabase_admin_client.table("manager_invitations").select(
            "*, managers(id, first_name, last_name, phone, address, city, state, country, zip_code, email, auth_user_id)"
        ).eq("token", token).execute()

        if not result.data:
            return ManagerVerifyTokenResponse(valid=False)

        invitation = result.data[0]

        # Check if already accepted
        if invitation.get("accepted_at"):
            return ManagerVerifyTokenResponse(valid=False)

        # Check expiry
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            return ManagerVerifyTokenResponse(valid=False)

        manager = invitation.get("managers", {}) or {}

        # Already has account
        if manager.get("auth_user_id"):
            return ManagerVerifyTokenResponse(
                valid=False,
                manager_id=manager.get("id"),
                first_name=manager.get("first_name"),
                last_name=manager.get("last_name"),
                email=invitation["email"],
            )

        return ManagerVerifyTokenResponse(
            valid=True,
            manager_id=manager.get("id"),
            first_name=manager.get("first_name"),
            last_name=manager.get("last_name"),
            email=invitation["email"],
            phone=manager.get("phone"),
            address=manager.get("address"),
            city=manager.get("city"),
            state=manager.get("state"),
            country=manager.get("country"),
            zip_code=manager.get("zip_code"),
        )
    except Exception as e:
        logger.error(f"Manager token verification error: {e}")
        return ManagerVerifyTokenResponse(valid=False)


@router.post("/onboarding/manager/setup-account", response_model=ManagerSetupAccountResponse)
async def setup_manager_account(data: ManagerSetupAccountRequest):
    """Create auth account for manager from invitation token. No auth required."""
    try:
        # Verify token
        inv_result = supabase_admin_client.table("manager_invitations").select(
            "*, managers(id, first_name, last_name, auth_user_id)"
        ).eq("token", data.token).execute()

        if not inv_result.data:
            raise HTTPException(status_code=400, detail="Invalid invitation token")

        invitation = inv_result.data[0]
        manager = invitation.get("managers", {}) or {}

        if manager.get("auth_user_id"):
            raise HTTPException(status_code=400, detail="Account already exists")

        if invitation.get("accepted_at"):
            raise HTTPException(status_code=400, detail="Invitation already used")

        # Check expiry
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Invitation expired")

        manager_id = manager["id"]
        email = invitation["email"]

        # Create Supabase auth user with role=manager
        auth_response = supabase_admin_client.auth.admin.create_user({
            "email": email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {
                "role": "manager",
                "first_name": manager.get("first_name", ""),
                "last_name": manager.get("last_name", ""),
            },
        })

        if not auth_response.user:
            raise Exception("Failed to create auth user")

        auth_user_id = str(auth_response.user.id)

        # Link auth user to manager
        supabase_admin_client.table("managers").update({
            "auth_user_id": auth_user_id,
            "onboarding_status": "in_progress",
        }).eq("id", manager_id).execute()

        # Mark invitation as accepted
        supabase_admin_client.table("manager_invitations").update({
            "accepted_at": datetime.utcnow().isoformat(),
        }).eq("token", data.token).execute()

        # Sign in to get tokens
        from backend.config import supabase_client
        sign_in = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": data.password,
        })

        return ManagerSetupAccountResponse(
            success=True,
            message="Account created successfully",
            access_token=sign_in.session.access_token,
            refresh_token=sign_in.session.refresh_token,
            manager_id=manager_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manager account setup failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Manager Endpoints (authenticated)
# ============================================================================

@router.put("/onboarding/manager/update-profile")
async def update_manager_profile(
    data: ManagerUpdateProfileRequest,
    user: dict = Depends(verify_token),
):
    """Update manager profile during onboarding."""
    try:
        manager_id = get_manager_id(user["user_id"])
        if not manager_id:
            raise HTTPException(status_code=404, detail="Manager profile not found")

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
            supabase_admin_client.table("managers").update(
                update_data
            ).eq("id", manager_id).execute()

        return {"success": True, "message": "Profile updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manager profile update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/manager/complete-profile", response_model=ManagerCompleteProfileResponse)
async def complete_manager_profile(
    data: ManagerUpdateProfileRequest,
    user: dict = Depends(verify_token),
):
    """
    Complete manager profile, register bank account, and generate contracts.
    One contract per active manager_assignment.
    """
    try:
        manager_id = get_manager_id(user["user_id"])
        if not manager_id:
            raise HTTPException(status_code=404, detail="Manager profile not found")

        # Validate required address fields
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
                detail=f"Missing required fields: {', '.join(missing)}. Please complete your profile.",
            )

        # Apply profile updates
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
            supabase_admin_client.table("managers").update(
                update_data
            ).eq("id", manager_id).execute()

        # Register bank account
        if data.bank_account_last4:
            existing = supabase_admin_client.table("bank_accounts").select("id").eq(
                "account_last4", data.bank_account_last4
            ).execute()

            if not existing.data:
                supabase_admin_client.table("bank_accounts").insert({
                    "account_last4": data.bank_account_last4,
                    "owner_type": "manager",
                    "owner_id": manager_id,
                    "is_active": True,
                }).execute()
            else:
                supabase_admin_client.table("bank_accounts").update({
                    "owner_type": "manager",
                    "owner_id": manager_id,
                }).eq("id", existing.data[0]["id"]).execute()

        # Generate contracts for each active assignment
        assignments = supabase_admin_client.table("manager_assignments").select(
            "id"
        ).eq("manager_id", manager_id).eq("is_active", True).execute()

        contract_ids = []
        for ma in (assignments.data or []):
            try:
                contract = ContractService.generate_manager_contract(manager_id, ma["id"])
                contract_ids.append(contract["id"])
            except Exception as e:
                logger.error(f"Failed to generate contract for manager assignment {ma['id']}: {e}")

        # Only mark completed if contracts were generated
        if contract_ids:
            supabase_admin_client.table("managers").update({
                "onboarding_status": "completed",
            }).eq("id", manager_id).execute()

        return ManagerCompleteProfileResponse(
            success=True,
            message=f"Profile completed. {len(contract_ids)} contract(s) generated.",
            contract_ids=contract_ids,
            onboarding_status="completed" if contract_ids else "in_progress",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manager profile completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
