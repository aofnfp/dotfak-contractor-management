#!/usr/bin/env python3
"""
Pydantic schemas for onboarding-related data.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================================
# Invitation Schemas
# ============================================================================

class InvitationCreate(BaseModel):
    """Schema for creating an invitation."""
    contractor_id: UUID
    email: EmailStr


class InvitationResponse(BaseModel):
    """Schema for invitation response."""
    id: UUID
    contractor_id: UUID
    email: str
    status: str
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime
    contractor_name: Optional[str] = None
    contractor_code: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Onboarding Status Schemas
# ============================================================================

class OnboardingStatusItem(BaseModel):
    """Schema for contractor onboarding status in admin list."""
    contractor_id: UUID
    contractor_name: str
    contractor_code: str
    email: Optional[str] = None
    onboarding_status: str
    has_active_assignment: bool
    has_auth_account: bool
    contract_status: Optional[str] = None


# ============================================================================
# Token Verification Schemas
# ============================================================================

class VerifyTokenResponse(BaseModel):
    """Schema returned when verifying an invitation token."""
    valid: bool
    contractor_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


# ============================================================================
# Account Setup Schemas
# ============================================================================

class SetupAccountRequest(BaseModel):
    """Schema for creating account from invitation."""
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, description="Password for the new account")


class SetupAccountResponse(BaseModel):
    """Schema for account setup response."""
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    contractor_id: Optional[str] = None


# ============================================================================
# Profile Update Schemas
# ============================================================================

class UpdateProfileRequest(BaseModel):
    """Schema for contractor profile update during onboarding."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    country: Optional[str] = Field(None, max_length=3, description="ISO country code (NG, US)")
    bank_account_last4: Optional[str] = Field(None, min_length=4, max_length=4, description="Last 4 digits of bank account")


class CompleteProfileResponse(BaseModel):
    """Schema for profile completion response."""
    success: bool
    message: str
    contract_id: Optional[str] = None
    onboarding_status: str
