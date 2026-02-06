#!/usr/bin/env python3
"""
Pydantic schemas for bank account tracking and assignment.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID


# ============================================================================
# Bank Account Schemas
# ============================================================================

class BankAccountBase(BaseModel):
    """Base bank account fields."""
    account_last4: str = Field(..., min_length=4, max_length=4, description="Last 4 digits of account number")
    bank_name: str = Field(..., max_length=255, description="Bank name (e.g., 'Chase Bank', 'Lead Bank')")
    account_name: Optional[str] = Field(None, max_length=255, description="Account holder name as shown on paystub")

    @validator('account_last4')
    def validate_last4(cls, v):
        """Ensure account_last4 contains only digits."""
        if not v.isdigit():
            raise ValueError('account_last4 must be 4 digits')
        return v


class BankAccountCreate(BankAccountBase):
    """Schema for creating a new bank account."""
    owner_type: Literal["contractor", "admin"] = Field(..., description="Account owner: 'contractor' or 'admin'")
    owner_id: UUID = Field(..., description="UUID of contractor_assignment or admin user")
    first_seen_paystub_id: int = Field(..., description="ID of paystub where this account first appeared")


class BankAccountUpdate(BaseModel):
    """Schema for updating bank account details."""
    bank_name: Optional[str] = Field(None, max_length=255)
    account_name: Optional[str] = Field(None, max_length=255)
    owner_type: Optional[Literal["contractor", "admin"]] = None
    owner_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class BankAccountResponse(BankAccountBase):
    """Schema for bank account response."""
    id: UUID
    owner_type: str
    owner_id: UUID
    first_seen_paystub_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Unassigned Account Info (from paystub parsing)
# ============================================================================

class UnassignedAccountInfo(BankAccountBase):
    """
    Information about a bank account from a paystub that hasn't been assigned yet.
    This is extracted from paystub_data['payment_info'] for accounts not in bank_accounts table.
    """
    amount: Decimal = Field(..., ge=0, description="Amount deposited to this account from current paystub")
    currency: str = Field(default="USD", description="Currency code")


# ============================================================================
# Account Assignment Schemas
# ============================================================================

class AccountAssignmentItem(BaseModel):
    """Single account assignment (used when assigning new accounts from a paystub)."""
    account_last4: str = Field(..., min_length=4, max_length=4)
    owner_type: Literal["contractor", "admin"]
    owner_id: UUID

    @validator('account_last4')
    def validate_last4(cls, v):
        """Ensure account_last4 contains only digits."""
        if not v.isdigit():
            raise ValueError('account_last4 must be 4 digits')
        return v


class AccountAssignmentRequest(BaseModel):
    """
    Request to assign new accounts from a paystub.
    Contains list of accounts with their owner assignments.
    """
    assignments: List[AccountAssignmentItem]

    @validator('assignments')
    def validate_assignments(cls, v):
        """Ensure at least one assignment provided."""
        if not v:
            raise ValueError('At least one assignment required')
        return v


class AccountAssignmentResponse(BaseModel):
    """Response after successfully assigning accounts."""
    paystub_id: int
    assigned_count: int
    success: bool


# ============================================================================
# Check Accounts Response
# ============================================================================

class CheckAccountsResponse(BaseModel):
    """
    Response from checking if a paystub has unassigned accounts.
    Used after paystub upload to determine if assignment UI should be shown.
    """
    paystub_id: int
    total_accounts: int = Field(..., description="Total accounts in paystub payment_info")
    assigned_accounts: int = Field(..., description="Accounts that were auto-matched and assigned")
    unassigned_accounts: List[UnassignedAccountInfo] = Field(..., description="NEW accounts that need assignment")
    needs_assignment: bool = Field(..., description="True if any unassigned accounts exist")


# ============================================================================
# Paystub Account Split Schemas
# ============================================================================

class PaystubAccountSplitBase(BaseModel):
    """Base fields for paystub account split."""
    paystub_id: int
    bank_account_id: UUID
    amount: Decimal = Field(..., ge=0)
    currency: str = Field(default="USD")


class PaystubAccountSplitCreate(PaystubAccountSplitBase):
    """Schema for creating a paystub account split entry."""
    pass


class PaystubAccountSplitResponse(PaystubAccountSplitBase):
    """Schema for paystub account split response."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaystubAccountSplitWithDetails(PaystubAccountSplitResponse):
    """Schema for paystub account split with bank account details."""
    account_last4: str
    bank_name: str
    account_name: Optional[str]
    owner_type: str
    owner_id: UUID

    class Config:
        from_attributes = True
