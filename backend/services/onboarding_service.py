#!/usr/bin/env python3
"""
Onboarding service - handles invitation creation, token verification, and account setup.
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)

FRONTEND_URL = "https://dotfak-contractor-management.netlify.app"
INVITATION_EXPIRY_DAYS = 7


class OnboardingService:
    """Handles contractor onboarding operations."""

    @staticmethod
    def generate_invitation_token() -> str:
        """Generate cryptographically secure 128-char hex token."""
        return secrets.token_hex(64)

    @staticmethod
    def create_invitation(contractor_id: str, email: str) -> dict:
        """
        Create invitation record in database.

        Returns the invitation record.
        """
        token = OnboardingService.generate_invitation_token()
        expires_at = datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS)

        result = supabase_admin_client.table("contractor_invitations").insert({
            "contractor_id": contractor_id,
            "email": email,
            "token": token,
            "status": "pending",
            "expires_at": expires_at.isoformat(),
        }).execute()

        if not result.data:
            raise Exception("Failed to create invitation")

        # Update contractor email and onboarding status
        supabase_admin_client.table("contractors").update({
            "email": email,
            "onboarding_status": "invited",
        }).eq("id", contractor_id).execute()

        return result.data[0]

    @staticmethod
    def get_invite_url(token: str) -> str:
        """Build the frontend onboarding URL."""
        return f"{FRONTEND_URL}/onboard?token={token}"

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """
        Verify invitation token is valid, pending, and not expired.

        Returns contractor info if valid, None otherwise.
        """
        result = supabase_admin_client.table("contractor_invitations").select(
            "*, contractors(id, first_name, last_name, phone, address, email, onboarding_status, auth_user_id)"
        ).eq("token", token).eq("status", "pending").execute()

        if not result.data:
            return None

        invitation = result.data[0]

        # Check expiry
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            # Mark as expired
            supabase_admin_client.table("contractor_invitations").update({
                "status": "expired"
            }).eq("id", invitation["id"]).execute()
            return None

        contractor = invitation.get("contractors", {})
        return {
            "invitation_id": invitation["id"],
            "contractor_id": contractor.get("id"),
            "first_name": contractor.get("first_name", ""),
            "last_name": contractor.get("last_name", ""),
            "email": invitation["email"],
            "phone": contractor.get("phone"),
            "address": contractor.get("address"),
            "already_has_account": contractor.get("auth_user_id") is not None,
        }

    @staticmethod
    def setup_account(token: str, password: str) -> dict:
        """
        Create Supabase auth user from invitation token.

        Returns session info (access_token, refresh_token).
        """
        # Verify token again
        token_data = OnboardingService.verify_token(token)
        if not token_data:
            raise Exception("Invalid or expired invitation token")

        if token_data["already_has_account"]:
            raise Exception("Account already exists for this contractor")

        contractor_id = token_data["contractor_id"]
        email = token_data["email"]

        # Create Supabase auth user
        auth_response = supabase_admin_client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "role": "contractor",
                "first_name": token_data["first_name"],
                "last_name": token_data["last_name"],
            },
        })

        if not auth_response.user:
            raise Exception("Failed to create auth user")

        auth_user_id = str(auth_response.user.id)

        # Link auth user to contractor
        supabase_admin_client.table("contractors").update({
            "auth_user_id": auth_user_id,
            "onboarding_status": "account_created",
        }).eq("id", contractor_id).execute()

        # Mark invitation as accepted
        supabase_admin_client.table("contractor_invitations").update({
            "status": "accepted",
            "accepted_at": datetime.utcnow().isoformat(),
        }).eq("token", token).execute()

        # Sign in to get session tokens
        from backend.config import supabase_client
        sign_in_response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })

        return {
            "access_token": sign_in_response.session.access_token,
            "refresh_token": sign_in_response.session.refresh_token,
            "contractor_id": contractor_id,
        }

    @staticmethod
    def advance_onboarding_status(contractor_id: str, new_status: str):
        """Update contractor onboarding status."""
        supabase_admin_client.table("contractors").update({
            "onboarding_status": new_status,
        }).eq("id", contractor_id).execute()

    @staticmethod
    def get_all_onboarding_statuses() -> list:
        """Get onboarding status for all contractors (admin view)."""
        # Get all contractors
        contractors = supabase_admin_client.table("contractors").select(
            "id, contractor_code, first_name, last_name, email, onboarding_status, auth_user_id"
        ).execute()

        result = []
        for c in contractors.data or []:
            # Check if they have an active assignment
            assignments = supabase_admin_client.table("contractor_assignments").select(
                "id"
            ).eq("contractor_id", c["id"]).eq("is_active", True).execute()

            # Get latest contract status
            contracts = supabase_admin_client.table("contracts").select(
                "status"
            ).eq("contractor_id", c["id"]).order("created_at", desc=True).limit(1).execute()

            result.append({
                "contractor_id": c["id"],
                "contractor_name": f"{c['first_name']} {c['last_name']}",
                "contractor_code": c["contractor_code"],
                "email": c.get("email"),
                "onboarding_status": c.get("onboarding_status", "not_invited"),
                "has_active_assignment": len(assignments.data or []) > 0,
                "has_auth_account": c.get("auth_user_id") is not None,
                "contract_status": contracts.data[0]["status"] if contracts.data else None,
            })

        return result
