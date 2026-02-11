"""
Manager earnings router - view manager earnings from staff paystubs.

IMPORTANT: Static routes (/summary) MUST be defined BEFORE dynamic routes (/{id})
to avoid FastAPI matching "summary" as a path parameter.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import verify_token, get_manager_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manager-earnings", tags=["manager-earnings"])


def _enrich_earning(earning: dict) -> dict:
    """Add manager_name, contractor_name, client_name to earning."""
    enriched = dict(earning)

    # Manager name
    if earning.get("manager_id"):
        mgr = supabase_admin_client.table("managers").select(
            "first_name, last_name"
        ).eq("id", earning["manager_id"]).execute()
        if mgr.data:
            enriched["manager_name"] = f"{mgr.data[0]['first_name']} {mgr.data[0]['last_name']}"

    # Contractor + client from contractor_assignment
    if earning.get("contractor_assignment_id"):
        ca = supabase_admin_client.table("contractor_assignments").select(
            "contractor_id, client_company_id"
        ).eq("id", earning["contractor_assignment_id"]).execute()

        if ca.data:
            contractor = supabase_admin_client.table("contractors").select(
                "first_name, last_name"
            ).eq("id", ca.data[0]["contractor_id"]).execute()
            if contractor.data:
                c = contractor.data[0]
                enriched["contractor_name"] = f"{c['first_name']} {c['last_name']}"

            client = supabase_admin_client.table("client_companies").select(
                "name"
            ).eq("id", ca.data[0]["client_company_id"]).execute()
            if client.data:
                enriched["client_name"] = client.data[0]["name"]

    return enriched


@router.get("/summary")
async def get_manager_earnings_summary(
    manager_id: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """
    Get manager earnings summary.
    - Admin: all managers or filter by manager_id
    - Manager: own summary only
    """
    try:
        role = user.get("role")

        query = supabase_admin_client.table("manager_earnings").select("*")

        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if not own_manager_id:
                return {
                    "total_earnings": 0, "total_paid": 0, "total_pending": 0,
                    "count_total": 0, "count_paid": 0, "count_unpaid": 0, "count_partially_paid": 0,
                }
            query = query.eq("manager_id", own_manager_id)
        elif role == "admin":
            if manager_id:
                query = query.eq("manager_id", manager_id)
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        result = query.execute()
        earnings = result.data or []

        total_earnings = sum(float(e.get("total_earnings", 0)) for e in earnings)
        total_paid = sum(float(e.get("amount_paid", 0)) for e in earnings)
        total_pending = sum(float(e.get("amount_pending", 0)) for e in earnings)
        count_paid = sum(1 for e in earnings if e.get("payment_status") == "paid")
        count_unpaid = sum(1 for e in earnings if e.get("payment_status") == "unpaid")
        count_partially_paid = sum(1 for e in earnings if e.get("payment_status") == "partially_paid")

        return {
            "total_earnings": total_earnings,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "count_total": len(earnings),
            "count_paid": count_paid,
            "count_unpaid": count_unpaid,
            "count_partially_paid": count_partially_paid,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get manager earnings summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get summary: {str(e)}"
        )


@router.get("")
async def list_manager_earnings(
    manager_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List manager earnings.
    - Admin: all (optionally filter by manager_id)
    - Manager: own earnings only
    """
    try:
        role = user.get("role")

        query = supabase_admin_client.table("manager_earnings").select("*")

        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if not own_manager_id:
                return []
            query = query.eq("manager_id", own_manager_id)
        elif role == "admin":
            if manager_id:
                query = query.eq("manager_id", manager_id)
        else:
            return []

        if payment_status:
            query = query.eq("payment_status", payment_status)

        result = query.order("pay_period_end", desc=True).limit(limit).execute()

        return [_enrich_earning(e) for e in (result.data or [])]

    except Exception as e:
        logger.error(f"Failed to list manager earnings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve manager earnings: {str(e)}"
        )


@router.get("/{earning_id}")
async def get_manager_earning(
    earning_id: str,
    user: dict = Depends(verify_token)
):
    """Get a single manager earning by ID."""
    try:
        role = user.get("role")

        result = supabase_admin_client.table("manager_earnings").select("*").eq("id", earning_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager earning not found")

        earning = result.data[0]

        # Manager can only view own
        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if earning["manager_id"] != own_manager_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        elif role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        return _enrich_earning(earning)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get manager earning: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve manager earning: {str(e)}"
        )
