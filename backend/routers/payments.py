#!/usr/bin/env python3
"""
Payment router - record payments and view payment history.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id
from backend.services import PaymentService
from backend.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentListItem,
    EarningsSummary
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


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

    Args:
        payment: Payment data
        user: Current user (admin)

    Returns:
        Payment record with allocations
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

    Args:
        contractor_id: Filter by contractor UUID (admin only)
        limit: Maximum number of results
        user: Current user

    Returns:
        List of payments
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


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get payment details by ID.

    - Admin: can view any payment
    - Contractor: can only view their own payments

    Args:
        payment_id: Payment UUID
        user: Current user

    Returns:
        Payment details with allocations
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


@router.get("/contractor/{contractor_id}/summary", response_model=EarningsSummary)
async def get_contractor_summary(
    contractor_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get earnings summary for a contractor.

    - Admin: can view any contractor's summary
    - Contractor: can only view their own summary

    Args:
        contractor_id: Contractor UUID
        user: Current user

    Returns:
        Summary of earnings and payments
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
