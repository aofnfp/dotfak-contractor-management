#!/usr/bin/env python3
"""
Pydantic schemas for contractor-related data.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================================
# Contractor Schemas
# ============================================================================

class ContractorBase(BaseModel):
    """Base contractor fields."""
    contractor_code: Optional[str] = Field(None, min_length=3, max_length=50, description="Unique contractor code (auto-generated if not provided, format: DTK-001)")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    ssn_last_4: Optional[str] = Field(None, min_length=4, max_length=4, description="Last 4 digits of SSN for verification")
    notes: Optional[str] = None
    is_active: bool = Field(default=True)


class ContractorCreate(ContractorBase):
    """Schema for creating a new contractor (admin only)."""
    email: Optional[EmailStr] = Field(None, description="Email to create auth account (optional)")
    password: Optional[str] = Field(None, min_length=8, description="Password for auth account (required if email provided)")


class ContractorUpdate(BaseModel):
    """Schema for updating contractor profile."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    ssn_last_4: Optional[str] = Field(None, min_length=4, max_length=4)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ContractorResponse(ContractorBase):
    """Schema for contractor response (full details for admin)."""
    id: UUID
    contractor_code: str = Field(..., description="Contractor code (always present in response)")
    auth_user_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractorListItem(BaseModel):
    """Schema for contractor in list view."""
    id: UUID
    contractor_code: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Contractor Assignment Schemas
# ============================================================================

class AssignmentBase(BaseModel):
    """Base assignment fields."""
    contractor_id: UUID
    client_company_id: UUID
    client_employee_id: Optional[str] = Field(None, max_length=50, description="Employee ID on client's paystub for auto-matching")

    # Rate structure (flexible: fixed OR percentage)
    rate_type: str = Field(..., description="Rate type: 'fixed' or 'percentage'")
    fixed_hourly_rate: Optional[float] = Field(None, ge=0, description="Fixed hourly rate (e.g., $4.00/hr)")
    percentage_rate: Optional[float] = Field(None, ge=0, le=100, description="Percentage of client payment (e.g., 25%)")
    bonus_split_percentage: float = Field(default=50.00, ge=0, le=100, description="Contractor's share of bonuses (%)")

    start_date: str = Field(..., description="Assignment start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Assignment end date (YYYY-MM-DD)")
    notes: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    """Schema for creating a new assignment."""
    pass


class AssignmentUpdate(BaseModel):
    """Schema for updating an assignment."""
    client_employee_id: Optional[str] = Field(None, max_length=50)
    rate_type: Optional[str] = Field(None, description="Rate type: 'fixed' or 'percentage'")
    fixed_hourly_rate: Optional[float] = Field(None, ge=0)
    percentage_rate: Optional[float] = Field(None, ge=0, le=100)
    bonus_split_percentage: Optional[float] = Field(None, ge=0, le=100)
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class AssignmentResponse(AssignmentBase):
    """Schema for assignment response."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssignmentWithDetails(AssignmentResponse):
    """Schema for assignment with contractor and client details."""
    contractor_name: str
    contractor_code: str
    client_name: str
    client_code: str

    class Config:
        from_attributes = True
