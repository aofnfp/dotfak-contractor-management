#!/usr/bin/env python3
"""
Payment router - record payments and view payment history.

IMPORTANT: Static routes (/summary, /preview-allocation, /contractor/*) MUST be
defined before the dynamic route (/{payment_id}) to avoid FastAPI matching
"summary" or "preview-allocation" as a payment_id path parameter.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from decimal import Decimal

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id, get_manager_id
from backend.services import PaymentService
from backend.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentListItem,
    EarningsSummary
)

from pydantic import BaseModel, Field
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


class ManagerPaymentCreate(BaseModel):
    manager_id: str
    amount: float = Field(..., gt=0)
    payment_method: Optional[str] = None
    payment_date: date
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment: PaymentCreate,
    user: dict = Depends(require_admin)
):
    """
    Record a payment to a contractor (admin only).

    This endpoint:
    1. Creates a payment record
    2. Allocates payment to earnings (FIFO by default, or manual)
    3. Updates earnings payment status
    4. Returns payment with allocations
    """
    try:
        # Verify contractor exists
        contractor = supabase_admin_client.table("contractors").select("id").eq(
            "id", str(payment.contractor_id)
        ).execute()

        if not contractor.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        # Record payment with allocation
        result = PaymentService.record_payment(
            contractor_id=str(payment.contractor_id),
            amount=payment.amount,
            payment_method=payment.payment_method,
            payment_date=str(payment.payment_date),
            transaction_reference=payment.transaction_reference,
            notes=payment.notes,
            recorded_by=user['user_id'],
            manual_allocations=payment.allocate_to_earnings
        )

        logger.info(f"Payment recorded: ${payment.amount} to contractor {payment.contractor_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record payment: {str(e)}"
        )


@router.get("", response_model=List[PaymentListItem])
async def list_payments(
    contractor_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List payments.

    - Admin: sees all payments (can filter by contractor)
    - Contractor: sees only their own payments
    """
    try:
        role = user.get("role")

        if role == "admin":
            query = supabase_admin_client.table("contractor_payments").select("*")

            if contractor_id:
                query = query.eq("contractor_id", contractor_id)

        else:
            # Contractor sees only their own payments
            own_contractor_id = get_contractor_id(user["user_id"])

            if not own_contractor_id:
                return []

            query = supabase_admin_client.table("contractor_payments").select("*").eq(
                "contractor_id", own_contractor_id
            )

        result = query.order("payment_date", desc=True).limit(limit).execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Failed to list payments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payments: {str(e)}"
        )


# ── Static routes (MUST be before /{payment_id}) ──────────────────────────

@router.get("/summary")
async def get_payments_summary(
    user: dict = Depends(require_admin)
):
    """
    Get payment summary statistics (admin only).

    Returns overall payment stats:
    - Total number of payments
    - Total amount paid
    - Count by payment method
    - Recent payments
    """
    try:
        # Get all payments
        payments_result = supabase_admin_client.table("contractor_payments").select("*").execute()
        payments = payments_result.data if payments_result.data else []

        # Calculate stats
        total_payments = len(payments)
        total_amount = sum(float(p['amount']) for p in payments)

        # Count by method
        count_by_method = {}
        for method in ['direct_deposit', 'check', 'cash', 'wire_transfer', 'other']:
            count_by_method[method] = sum(1 for p in payments if p['payment_method'] == method)

        # Get recent payments (last 5)
        recent = supabase_admin_client.table("contractor_payments").select(
            "*, contractors(contractor_code, first_name, last_name)"
        ).order("created_at", desc=True).limit(5).execute()

        return {
            'total_payments': total_payments,
            'total_amount': total_amount,
            'count_by_method': count_by_method,
            'recent_payments': recent.data if recent.data else []
        }

    except Exception as e:
        logger.error(f"Failed to get payments summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payments summary: {str(e)}"
        )


@router.get("/preview-allocation")
async def preview_allocation(
    contractor_id: str,
    amount: float,
    user: dict = Depends(require_admin)
):
    """
    Preview FIFO allocation for a payment amount (admin only).

    Shows how a payment would be distributed across unpaid earnings.
    """
    try:
        preview = PaymentService.preview_fifo_allocation(contractor_id, amount)
        return preview

    except Exception as e:
        logger.error(f"Failed to preview allocation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview allocation: {str(e)}"
        )


@router.get("/contractor/{contractor_id}/summary", response_model=EarningsSummary)
async def get_contractor_summary(
    contractor_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get earnings summary for a contractor.

    - Admin: can view any contractor's summary
    - Contractor: can only view their own summary
    """
    try:
        # Check authorization for contractors
        if user.get("role") != "admin":
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(contractor_id) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own summary"
                )

        summary = PaymentService.get_earnings_summary(contractor_id)

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve summary: {str(e)}"
        )


@router.get("/contractor/{contractor_id}")
async def get_contractor_payments(
    contractor_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get all payments for a contractor.

    - Admin: can view any contractor's payments
    - Contractor: can only view their own payments
    """
    try:
        # Check authorization for contractors
        if user.get("role") != "admin":
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(contractor_id) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own payments"
                )

        # Get payments for this contractor
        payments_result = supabase_admin_client.table("contractor_payments").select(
            "*, contractors(contractor_code, first_name, last_name)"
        ).eq("contractor_id", contractor_id).order("payment_date", desc=True).execute()

        return payments_result.data if payments_result.data else []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get contractor payments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payments: {str(e)}"
        )


# ── Manager payment endpoints (MUST be before /{payment_id}) ────────────────

@router.post("/manager", status_code=status.HTTP_201_CREATED)
async def record_manager_payment(
    payment: ManagerPaymentCreate,
    user: dict = Depends(require_admin),
):
    """
    Record a payment to a manager (admin only).
    Auto-allocates to unpaid manager_earnings using FIFO.
    """
    try:
        manager = supabase_admin_client.table("managers").select("id").eq(
            "id", payment.manager_id
        ).execute()

        if not manager.data:
            raise HTTPException(status_code=404, detail="Manager not found")

        payment_amount = Decimal(str(payment.amount))

        # Create payment record
        payment_data = {
            "manager_id": payment.manager_id,
            "amount": payment.amount,
            "payment_method": payment.payment_method,
            "payment_date": str(payment.payment_date),
            "transaction_reference": payment.transaction_reference,
            "notes": payment.notes,
            "recorded_by": user["user_id"],
        }
        result = supabase_admin_client.table("manager_payments").insert(payment_data).execute()
        if not result.data:
            raise Exception("Failed to create manager payment")

        mgr_payment = result.data[0]
        payment_id = mgr_payment["id"]

        # FIFO allocation to unpaid manager_earnings
        unpaid = supabase_admin_client.table("manager_earnings").select("*").eq(
            "manager_id", payment.manager_id
        ).in_("payment_status", ["unpaid", "partially_paid"]).order(
            "pay_period_begin", desc=False
        ).execute()

        remaining = payment_amount
        allocations = []

        for earning in (unpaid.data or []):
            if remaining <= 0:
                break
            pending = Decimal(str(earning.get("amount_pending") or 0))
            if pending <= 0:
                continue

            alloc_amount = min(remaining, pending)
            remaining -= alloc_amount

            # Save allocation
            supabase_admin_client.table("manager_payment_allocations").insert({
                "payment_id": payment_id,
                "manager_earning_id": earning["id"],
                "amount_allocated": float(alloc_amount),
            }).execute()

            # Update earning
            new_paid = Decimal(str(earning.get("amount_paid") or 0)) + alloc_amount
            total = Decimal(str(earning.get("total_earnings") or 0))
            new_pending = total - new_paid
            new_status = "paid" if new_pending <= 0 else ("partially_paid" if new_paid > 0 else "unpaid")

            supabase_admin_client.table("manager_earnings").update({
                "amount_paid": float(new_paid),
                "amount_pending": float(new_pending),
                "payment_status": new_status,
            }).eq("id", earning["id"]).execute()

            allocations.append({
                "earning_id": earning["id"],
                "amount": float(alloc_amount),
            })

        mgr_payment["allocations"] = allocations
        logger.info(f"Manager payment recorded: ${payment.amount} to manager {payment.manager_id}, allocated to {len(allocations)} earning(s)")
        return mgr_payment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record manager payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manager/list")
async def list_manager_payments(
    manager_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(verify_token),
):
    """
    List manager payments.
    - Admin: sees all (can filter by manager_id)
    - Manager: sees only their own
    """
    try:
        role = user.get("role")

        if role == "admin":
            query = supabase_admin_client.table("manager_payments").select(
                "*, managers(first_name, last_name)"
            )
            if manager_id:
                query = query.eq("manager_id", manager_id)
        else:
            own_manager_id = get_manager_id(user["user_id"])
            if not own_manager_id:
                return []
            query = supabase_admin_client.table("manager_payments").select(
                "*, managers(first_name, last_name)"
            ).eq("manager_id", own_manager_id)

        result = query.order("payment_date", desc=True).limit(limit).execute()

        # Enrich with manager_name
        payments = []
        for p in (result.data or []):
            mgr = p.pop("managers", {}) or {}
            p["manager_name"] = f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
            payments.append(p)

        return payments

    except Exception as e:
        logger.error(f"Failed to list manager payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/manager/{payment_id}")
async def delete_manager_payment(
    payment_id: str,
    user: dict = Depends(require_admin),
):
    """Delete a manager payment and reverse allocations (admin only)."""
    try:
        payment = supabase_admin_client.table("manager_payments").select("*").eq(
            "id", payment_id
        ).execute()

        if not payment.data:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Get allocations to reverse
        allocs = supabase_admin_client.table("manager_payment_allocations").select("*").eq(
            "payment_id", payment_id
        ).execute()

        for alloc in (allocs.data or []):
            earning = supabase_admin_client.table("manager_earnings").select("*").eq(
                "id", alloc["manager_earning_id"]
            ).execute()

            if earning.data:
                e = earning.data[0]
                new_paid = max(0, float(e.get("amount_paid") or 0) - float(alloc["amount_allocated"]))
                total = float(e.get("total_earnings") or 0)
                new_pending = total - new_paid
                new_status = "paid" if new_pending <= 0 else ("partially_paid" if new_paid > 0 else "unpaid")

                supabase_admin_client.table("manager_earnings").update({
                    "amount_paid": new_paid,
                    "amount_pending": new_pending,
                    "payment_status": new_status,
                }).eq("id", alloc["manager_earning_id"]).execute()

        # Delete payment (cascades to allocations via ON DELETE CASCADE)
        supabase_admin_client.table("manager_payments").delete().eq("id", payment_id).execute()

        return {"message": "Manager payment deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete manager payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Dynamic routes (catch-all MUST be last) ────────────────────────────────

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get payment details by ID.

    - Admin: can view any payment
    - Contractor: can only view their own payments
    """
    try:
        # Get payment
        payment_result = supabase_admin_client.table("contractor_payments").select("*").eq(
            "id", payment_id
        ).execute()

        if not payment_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        payment = payment_result.data[0]

        # Check authorization for contractors
        if user.get("role") != "admin":
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(payment["contractor_id"]) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own payments"
                )

        # Get allocations
        allocations_result = supabase_admin_client.table("payment_allocations").select("*").eq(
            "payment_id", payment_id
        ).execute()

        if allocations_result.data:
            payment['allocations'] = allocations_result.data

        return payment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payment: {str(e)}"
        )


@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: str,
    user: dict = Depends(require_admin)
):
    """
    Delete a payment and reverse its allocations (admin only).

    CRITICAL: This will:
    1. Delete the payment record
    2. Delete all payment allocations
    3. Restore the earnings to unpaid/partially_paid status
    """
    try:
        # Check if payment exists
        payment_result = supabase_admin_client.table("contractor_payments").select("*").eq(
            "id", payment_id
        ).execute()

        if not payment_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        # Delete payment (cascades to allocations via database)
        PaymentService.delete_payment(payment_id)

        return {"message": "Payment deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete payment: {str(e)}"
        )
