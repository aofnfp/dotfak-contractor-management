#!/usr/bin/env python3
"""
Dashboard statistics router - provides overview metrics for admin dashboard.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(require_admin)) -> Dict:
    """
    Get dashboard statistics for admin view.

    Returns:
        - total_contractors: Total number of contractors
        - total_unpaid: Total unpaid amount across all contractors
        - recent_paystubs: Number of paystubs uploaded in last 30 days
        - this_month_earnings: Total earnings for current month

    Requires: Admin authentication
    """
    try:
        # 1. Total contractors count
        contractors_response = supabase_admin_client.table("contractors").select(
            "id", count="exact"
        ).execute()
        total_contractors = contractors_response.count or 0

        # 2. Total unpaid amount (sum of amount_pending from contractor_earnings)
        unpaid_response = supabase_admin_client.table("contractor_earnings").select(
            "amount_pending"
        ).execute()

        total_unpaid = 0.0
        if unpaid_response.data:
            total_unpaid = sum(float(earning.get("amount_pending", 0)) for earning in unpaid_response.data)

        # 3. Recent paystubs (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        recent_paystubs_response = supabase_admin_client.table("paystubs").select(
            "id", count="exact"
        ).gte("created_at", thirty_days_ago).execute()
        recent_paystubs = recent_paystubs_response.count or 0

        # 4. This month's earnings (contractor_total_earnings from current month)
        first_day_of_month = datetime.now().replace(day=1).date().isoformat()
        this_month_response = supabase_admin_client.table("contractor_earnings").select(
            "contractor_total_earnings"
        ).gte("pay_period_end", first_day_of_month).execute()

        this_month_earnings = 0.0
        if this_month_response.data:
            this_month_earnings = sum(
                float(earning.get("contractor_total_earnings", 0))
                for earning in this_month_response.data
            )

        return {
            "total_contractors": total_contractors,
            "total_unpaid": round(total_unpaid, 2),
            "recent_paystubs": recent_paystubs,
            "this_month_earnings": round(this_month_earnings, 2),
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )
