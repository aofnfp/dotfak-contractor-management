#!/usr/bin/env python3
"""
Earnings router - view contractor earnings with payment status.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id
from backend.schemas import EarningsResponse, EarningsDetailResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/earnings", tags=["earnings"])


@router.get("", response_model=List[EarningsResponse])
async def list_earnings(
    contractor_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List earnings.

    - Admin: sees all earnings (can filter by contractor)
    - Contractor: sees only their own earnings

    Args:
        contractor_id: Filter by contractor UUID (admin only)
        payment_status: Filter by payment status (unpaid, partially_paid, paid)
        limit: Maximum number of results
        user: Current user

    Returns:
        List of earnings
    """
    try:
        role = user.get("role")

        # Build query based on role
        if role == "admin":
            if contractor_id:
                # Admin filtering by specific contractor
                assignments = supabase_admin_client.table("contractor_assignments").select("id").eq(
                    "contractor_id", contractor_id
                ).execute()

                if not assignments.data:
                    return []

                assignment_ids = [a['id'] for a in assignments.data]
                query = supabase_admin_client.table("contractor_earnings").select("*").in_(
                    "contractor_assignment_id", assignment_ids
                )
            else:
                # Admin seeing all earnings
                query = supabase_admin_client.table("contractor_earnings").select("*")

        else:
            # Contractor sees only their own earnings
            own_contractor_id = get_contractor_id(user["user_id"])

            if not own_contractor_id:
                return []

            assignments = supabase_admin_client.table("contractor_assignments").select("id").eq(
                "contractor_id", own_contractor_id
            ).execute()

            if not assignments.data:
                return []

            assignment_ids = [a['id'] for a in assignments.data]
            query = supabase_admin_client.table("contractor_earnings").select("*").in_(
                "contractor_assignment_id", assignment_ids
            )

        # Apply payment status filter if provided
        if payment_status:
            query = query.eq("payment_status", payment_status)

        result = query.order("pay_period_begin", desc=True).limit(limit).execute()

        # Enrich earnings with contractor and client details
        enriched_earnings = []
        for earning in result.data or []:
            enriched = dict(earning)

            # Add contractor details
            if earning.get('contractor_assignment_id'):
                assignment = supabase_admin_client.table("contractor_assignments").select(
                    "contractor_id, client_company_id"
                ).eq("id", earning['contractor_assignment_id']).execute()

                if assignment.data:
                    # Get contractor info
                    contractor = supabase_admin_client.table("contractors").select(
                        "first_name, last_name, contractor_code"
                    ).eq("id", assignment.data[0]['contractor_id']).execute()

                    if contractor.data:
                        c = contractor.data[0]
                        enriched['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                        enriched['contractor_code'] = c['contractor_code']

                    # Get client company info
                    client = supabase_admin_client.table("client_companies").select(
                        "name, code"
                    ).eq("id", assignment.data[0]['client_company_id']).execute()

                    if client.data:
                        enriched['client_name'] = client.data[0]['name']
                        enriched['client_code'] = client.data[0]['code']

            # Add paystub info
            if earning.get('paystub_id'):
                paystub = supabase_admin_client.table("paystubs").select(
                    "file_name, check_date"
                ).eq("id", earning['paystub_id']).execute()

                if paystub.data:
                    enriched['paystub_file_name'] = paystub.data[0].get('file_name')
                    enriched['paystub_check_date'] = paystub.data[0].get('check_date')

            enriched_earnings.append(enriched)

        return enriched_earnings

    except Exception as e:
        logger.error(f"Failed to list earnings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve earnings: {str(e)}"
        )


@router.get("/{earning_id}")
async def get_earning(
    earning_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get earning details by ID.

    - Admin: can view any earning (sees all fields including company_margin)
    - Contractor: can only view their own earnings (filtered response)

    Args:
        earning_id: Earning UUID
        user: Current user

    Returns:
        Earning details
    """
    try:
        # Get earning
        earning_result = supabase_admin_client.table("contractor_earnings").select("*").eq(
            "id", earning_id
        ).execute()

        if not earning_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Earning not found"
            )

        earning = earning_result.data[0]

        # Check authorization for contractors
        if user.get("role") != "admin":
            # Get contractor's assignment IDs
            own_contractor_id = get_contractor_id(user["user_id"])

            assignments = supabase_admin_client.table("contractor_assignments").select("id").eq(
                "contractor_id", own_contractor_id
            ).execute()

            assignment_ids = [a['id'] for a in assignments.data]

            if earning["contractor_assignment_id"] not in assignment_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own earnings"
                )

            # Filter response for contractor (remove sensitive fields)
            filtered_earning = {
                'id': earning['id'],
                'pay_period_begin': earning['pay_period_begin'],
                'pay_period_end': earning['pay_period_end'],
                'client_total_hours': earning['client_total_hours'],
                'contractor_total_earnings': earning['contractor_total_earnings'],
                'contractor_regular_earnings': earning['contractor_regular_earnings'],
                'contractor_bonus_share': earning['contractor_bonus_share'],
                'payment_status': earning['payment_status'],
                'amount_paid': earning['amount_paid'],
                'amount_pending': earning['amount_pending'],
                'created_at': earning['created_at']
            }
            return filtered_earning

        # Admin sees everything
        return earning

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get earning: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve earning: {str(e)}"
        )


@router.get("/unpaid/list")
async def list_unpaid_earnings(
    user: dict = Depends(require_admin)
):
    """
    List all unpaid/partially paid earnings across all contractors (admin only).

    Useful for seeing who needs to be paid.

    Args:
        user: Current user (admin)

    Returns:
        List of unpaid earnings with contractor info
    """
    try:
        # Get all unpaid/partially paid earnings
        result = supabase_admin_client.table("contractor_earnings").select("*").in_(
            "payment_status", ["unpaid", "partially_paid"]
        ).order(
            "pay_period_begin", desc=False  # Oldest first (FIFO)
        ).execute()

        # Enrich earnings with contractor and client details
        enriched_earnings = []
        for earning in result.data or []:
            enriched = dict(earning)

            # Add contractor details
            if earning.get('contractor_assignment_id'):
                assignment = supabase_admin_client.table("contractor_assignments").select(
                    "contractor_id, client_company_id"
                ).eq("id", earning['contractor_assignment_id']).execute()

                if assignment.data:
                    # Get contractor info
                    contractor = supabase_admin_client.table("contractors").select(
                        "first_name, last_name, contractor_code"
                    ).eq("id", assignment.data[0]['contractor_id']).execute()

                    if contractor.data:
                        c = contractor.data[0]
                        enriched['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                        enriched['contractor_code'] = c['contractor_code']

                    # Get client company info
                    client = supabase_admin_client.table("client_companies").select(
                        "name, code"
                    ).eq("id", assignment.data[0]['client_company_id']).execute()

                    if client.data:
                        enriched['client_name'] = client.data[0]['name']
                        enriched['client_code'] = client.data[0]['code']

            # Add paystub info
            if earning.get('paystub_id'):
                paystub = supabase_admin_client.table("paystubs").select(
                    "file_name, check_date"
                ).eq("id", earning['paystub_id']).execute()

                if paystub.data:
                    enriched['paystub_file_name'] = paystub.data[0].get('file_name')
                    enriched['paystub_check_date'] = paystub.data[0].get('check_date')

            enriched_earnings.append(enriched)

        return enriched_earnings

    except Exception as e:
        logger.error(f"Failed to list unpaid earnings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve unpaid earnings: {str(e)}"
        )


@router.get("/summary")
async def get_earnings_summary(
    user: dict = Depends(require_admin)
):
    """
    Get earnings summary statistics (admin only).

    Returns aggregate stats across all earnings:
    - Total earnings
    - Total paid
    - Total pending
    - Count by payment status

    Args:
        user: Current user (admin)

    Returns:
        Summary statistics
    """
    try:
        # Get all earnings
        earnings_result = supabase_admin_client.table("contractor_earnings").select("*").execute()

        earnings = earnings_result.data if earnings_result.data else []

        # Calculate summary stats
        total_earnings = sum(float(e.get('contractor_total_earnings') or 0) for e in earnings)
        total_paid = sum(float(e.get('amount_paid') or 0) for e in earnings)
        total_pending = sum(float(e.get('amount_pending') or 0) for e in earnings)

        count_unpaid = sum(1 for e in earnings if e['payment_status'] == 'unpaid')
        count_partially_paid = sum(1 for e in earnings if e['payment_status'] == 'partially_paid')
        count_paid = sum(1 for e in earnings if e['payment_status'] == 'paid')

        return {
            'total_earnings': total_earnings,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'count_unpaid': count_unpaid,
            'count_partially_paid': count_partially_paid,
            'count_paid': count_paid
        }

    except Exception as e:
        logger.error(f"Failed to get earnings summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve earnings summary: {str(e)}"
        )
