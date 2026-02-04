#!/usr/bin/env python3
"""
Pydantic schemas for payment-related data.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# ============================================================================
# Payment Schemas
# ============================================================================

class PaymentCreate(BaseModel):
    """Schema for recording a new payment."""
    contractor_id: UUID
    amount: float = Field(..., gt=0, description="Payment amount (must be positive)")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method (e.g., direct_deposit, check, cash, zelle)")
    payment_date: date = Field(..., description="Date payment was made")
    transaction_reference: Optional[str] = Field(None, max_length=255, description="Transaction ID or check number")
    notes: Optional[str] = None
    allocate_to_earnings: Optional[List[dict]] = Field(
        None,
        description="Optional: Manually specify which earnings to allocate to. Format: [{'earning_id': 'uuid', 'amount': 100.00}]"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "contractor_id": "c837a277-94c7-4cc6-8a5f-bd8fe9b19656",
                "amount": 500.00,
                "payment_method": "direct_deposit",
                "payment_date": "2025-02-15",
                "transaction_reference": "TXN-12345",
                "notes": "Payment for Jan-Feb earnings"
            }
        }


class PaymentResponse(BaseModel):
    """Schema for payment response."""
    id: UUID
    contractor_id: UUID
    amount: float
    payment_method: Optional[str]
    payment_date: date
    transaction_reference: Optional[str]
    notes: Optional[str]
    recorded_by: UUID
    created_at: datetime
    allocations: Optional[List[dict]] = None

    class Config:
        from_attributes = True


class PaymentListItem(BaseModel):
    """Schema for payment in list view."""
    id: UUID
    contractor_id: UUID
    amount: float
    payment_method: Optional[str]
    payment_date: date
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Earnings Schemas
# ============================================================================

class EarningsResponse(BaseModel):
    """Schema for earnings response (filtered for contractor view)."""
    id: UUID
    pay_period_begin: date
    pay_period_end: date
    client_total_hours: float
    contractor_total_earnings: float
    contractor_regular_earnings: float
    contractor_bonus_share: float
    payment_status: str
    amount_paid: float
    amount_pending: float
    created_at: datetime

    class Config:
        from_attributes = True


class EarningsDetailResponse(EarningsResponse):
    """Schema for detailed earnings response (admin view with company margin)."""
    client_gross_pay: float
    company_margin: float
    contractor_assignment_id: UUID
    paystub_id: int


class EarningsSummary(BaseModel):
    """Summary of earnings for a contractor."""
    total_earned: float
    total_paid: float
    total_pending: float
    earnings_count: int
    oldest_unpaid_date: Optional[date] = None


# ============================================================================
# Allocation Schemas
# ============================================================================

class AllocationResponse(BaseModel):
    """Schema for payment allocation."""
    id: UUID
    payment_id: UUID
    earning_id: UUID
    amount_allocated: float
    created_at: datetime

    class Config:
        from_attributes = True


class AllocationRequest(BaseModel):
    """Schema for manual allocation."""
    earning_id: UUID
    amount: float = Field(..., gt=0, description="Amount to allocate")
