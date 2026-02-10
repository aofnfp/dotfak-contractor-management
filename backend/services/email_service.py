#!/usr/bin/env python3
"""
Email service using Microsoft Graph API.

Sends emails via OAuth2 client credentials flow.
Requires Azure AD app registration with Mail.Send permission.
"""

import os
import time
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    """Send emails via Microsoft Graph API."""

    def __init__(self):
        self.client_id = os.getenv("MS_GRAPH_CLIENT_ID", "")
        self.client_secret = os.getenv("MS_GRAPH_CLIENT_SECRET", "")
        self.tenant_id = os.getenv("MS_GRAPH_TENANT_ID", "")
        self.sender_email = os.getenv("MS_GRAPH_SENDER_EMAIL", "")
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        self.graph_url = "https://graph.microsoft.com/v1.0"
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0

    @property
    def is_configured(self) -> bool:
        """Check if all required env vars are set."""
        return all([self.client_id, self.client_secret, self.tenant_id, self.sender_email])

    async def _get_access_token(self) -> str:
        """Get or refresh OAuth2 access token using client credentials flow."""
        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "scope": "https://graph.microsoft.com/.default",
                    "client_secret": self.client_secret,
                    "grant_type": "client_credentials",
                },
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["access_token"]
            self._token_expires_at = time.time() + data.get("expires_in", 3600)
            return self._access_token

    async def _send_mail(self, to_email: str, subject: str, html_body: str):
        """Send an email via Microsoft Graph API."""
        if not self.is_configured:
            logger.warning(f"Email service not configured. Would send to {to_email}: {subject}")
            return

        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.graph_url}/users/{self.sender_email}/sendMail",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={
                    "message": {
                        "subject": subject,
                        "body": {
                            "contentType": "HTML",
                            "content": html_body,
                        },
                        "toRecipients": [
                            {"emailAddress": {"address": to_email}}
                        ],
                    }
                },
            )
            if response.status_code not in (200, 202):
                logger.error(f"Failed to send email: {response.status_code} {response.text}")
                raise Exception(f"Email send failed: {response.status_code}")

            logger.info(f"Email sent to {to_email}: {subject}")

    async def send_invitation(self, to_email: str, contractor_name: str, invite_url: str):
        """Send onboarding invitation email."""
        subject = "Welcome to Dotfak Group - Complete Your Onboarding"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">Dotfak Group LLC</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333;">Welcome, {contractor_name}!</h2>
                <p style="color: #555; line-height: 1.6;">
                    You have been invited to join Dotfak Group LLC as an independent contractor.
                    Please complete your onboarding by clicking the button below.
                </p>
                <p style="color: #555; line-height: 1.6;">
                    During onboarding, you will:
                </p>
                <ul style="color: #555; line-height: 1.8;">
                    <li>Set up your account password</li>
                    <li>Verify your profile information</li>
                    <li>Review and sign your contractor agreement</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_url}"
                       style="background: #00d4aa; color: #1a1a2e; padding: 14px 32px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Complete Your Onboarding
                    </a>
                </div>
                <p style="color: #999; font-size: 13px;">
                    This invitation link expires in 7 days. If the button doesn't work,
                    copy and paste this URL into your browser:
                </p>
                <p style="color: #999; font-size: 12px; word-break: break-all;">
                    {invite_url}
                </p>
            </div>
            <div style="background: #f5f5f5; padding: 15px; text-align: center;
                        border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    Dotfak Group LLC &bull; Texas, USA
                </p>
            </div>
        </div>
        """
        await self._send_mail(to_email, subject, html_body)

    async def send_contract_ready(self, to_email: str, contractor_name: str, login_url: str):
        """Notify contractor that a new contract/amendment is ready for review."""
        subject = "Dotfak Group - Contract Ready for Review"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">Dotfak Group LLC</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333;">Contract Ready, {contractor_name}</h2>
                <p style="color: #555; line-height: 1.6;">
                    A contract or amendment is ready for your review and signature.
                    Please log in to review and sign.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}"
                       style="background: #00d4aa; color: #1a1a2e; padding: 14px 32px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Review Contract
                    </a>
                </div>
            </div>
            <div style="background: #f5f5f5; padding: 15px; text-align: center;
                        border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">Dotfak Group LLC &bull; Texas, USA</p>
            </div>
        </div>
        """
        await self._send_mail(to_email, subject, html_body)

    async def send_admin_signature_needed(self, admin_email: str, contractor_name: str, dashboard_url: str):
        """Notify admin that a contract needs counter-signing."""
        subject = f"Dotfak Group - Contract Signed by {contractor_name} - Your Signature Needed"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">Dotfak Group LLC</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333;">Signature Required</h2>
                <p style="color: #555; line-height: 1.6;">
                    <strong>{contractor_name}</strong> has signed their contractor agreement.
                    Your counter-signature is needed to finalize the contract.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}"
                       style="background: #00d4aa; color: #1a1a2e; padding: 14px 32px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Sign Contract
                    </a>
                </div>
            </div>
            <div style="background: #f5f5f5; padding: 15px; text-align: center;
                        border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">Dotfak Group LLC &bull; Texas, USA</p>
            </div>
        </div>
        """
        await self._send_mail(admin_email, subject, html_body)

    async def send_contract_executed(self, to_email: str, contractor_name: str, pdf_url: str):
        """Notify that contract is fully executed."""
        subject = "Dotfak Group - Contract Fully Executed"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #00d4aa; margin: 0; font-size: 24px;">Dotfak Group LLC</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333;">Contract Finalized</h2>
                <p style="color: #555; line-height: 1.6;">
                    Hi {contractor_name}, your contractor agreement has been fully executed.
                    Both parties have signed. You can download the signed PDF from your dashboard.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{pdf_url}"
                       style="background: #00d4aa; color: #1a1a2e; padding: 14px 32px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Download Contract PDF
                    </a>
                </div>
            </div>
            <div style="background: #f5f5f5; padding: 15px; text-align: center;
                        border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">Dotfak Group LLC &bull; Texas, USA</p>
            </div>
        </div>
        """
        await self._send_mail(to_email, subject, html_body)


# Singleton instance
email_service = EmailService()
