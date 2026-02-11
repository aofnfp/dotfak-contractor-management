#!/usr/bin/env python3
"""
Dashboard statistics router - provides overview metrics for admin dashboard.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict
from datetime import datetime, timedelta
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_contractor_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(require_admin)) -> Dict:
    """
    Get comprehensive dashboard statistics for admin view.
    """
    try:
        # Fetch all data in parallel-ish (single connection but minimal queries)
        contractors_resp = supabase_admin_client.table("contractors").select(
            "id, is_active", count="exact"
        ).execute()

        earnings_resp = supabase_admin_client.table("contractor_earnings").select(
            "pay_period_begin, pay_period_end, client_gross_pay, client_total_hours, "
            "contractor_regular_earnings, contractor_bonus_share, contractor_total_earnings, "
            "company_margin, amount_paid, amount_pending, payment_status, variance_status"
        ).order("pay_period_begin").execute()

        paystubs_resp = supabase_admin_client.table("paystubs").select(
            "id, created_at", count="exact"
        ).execute()

        splits_resp = supabase_admin_client.table("paystub_account_splits").select(
            "amount, bank_accounts!inner(owner_type)"
        ).execute()

        # --- Contractor counts ---
        total_contractors = contractors_resp.count or 0
        active_contractors = sum(1 for c in (contractors_resp.data or []) if c.get('is_active'))

        # --- Earnings aggregation ---
        earnings = earnings_resp.data or []
        now = datetime.now()
        first_of_month = now.replace(day=1).date().isoformat()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()

        total_client_gross = 0.0
        total_contractor_earnings = 0.0
        total_regular = 0.0
        total_bonus = 0.0
        total_margin = 0.0
        total_paid = 0.0
        total_pending = 0.0
        total_hours = 0.0
        count_paid = 0
        count_partial = 0
        count_unpaid = 0
        this_month_earnings = 0.0
        this_month_hours = 0.0
        this_month_margin = 0.0
        monthly_data: Dict[str, Dict] = {}

        for e in earnings:
            client_gross = float(e.get('client_gross_pay') or 0)
            contractor_earn = float(e.get('contractor_total_earnings') or 0)
            regular = float(e.get('contractor_regular_earnings') or 0)
            bonus = float(e.get('contractor_bonus_share') or 0)
            margin = float(e.get('company_margin') or 0)
            paid = float(e.get('amount_paid') or 0)
            pending = float(e.get('amount_pending') or 0)
            hours = float(e.get('client_total_hours') or 0)
            pay_status = e.get('payment_status', 'unpaid')
            period_begin = e.get('pay_period_begin', '')

            total_client_gross += client_gross
            total_contractor_earnings += contractor_earn
            total_regular += regular
            total_bonus += bonus
            total_margin += margin
            total_paid += paid
            total_pending += pending
            total_hours += hours

            if pay_status == 'paid':
                count_paid += 1
            elif pay_status == 'partially_paid':
                count_partial += 1
            else:
                count_unpaid += 1

            # This month
            period_end = e.get('pay_period_end', '')
            if period_end >= first_of_month:
                this_month_earnings += contractor_earn
                this_month_hours += hours
                this_month_margin += margin

            # Monthly breakdown
            month_key = period_begin[:7] if period_begin else 'unknown'
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'month': month_key,
                    'paystubs': 0,
                    'hours': 0.0,
                    'client_gross': 0.0,
                    'contractor_earnings': 0.0,
                    'regular': 0.0,
                    'bonus': 0.0,
                    'margin': 0.0,
                    'paid': 0.0,
                    'pending': 0.0,
                }
            m = monthly_data[month_key]
            m['paystubs'] += 1
            m['hours'] += hours
            m['client_gross'] += client_gross
            m['contractor_earnings'] += contractor_earn
            m['regular'] += regular
            m['bonus'] += bonus
            m['margin'] += margin
            m['paid'] += paid
            m['pending'] += pending

        # Round monthly data
        monthly_trend = []
        for key in sorted(monthly_data.keys()):
            m = monthly_data[key]
            monthly_trend.append({
                'month': m['month'],
                'paystubs': m['paystubs'],
                'hours': round(m['hours'], 2),
                'client_gross': round(m['client_gross'], 2),
                'contractor_earnings': round(m['contractor_earnings'], 2),
                'regular': round(m['regular'], 2),
                'bonus': round(m['bonus'], 2),
                'margin': round(m['margin'], 2),
                'paid': round(m['paid'], 2),
                'pending': round(m['pending'], 2),
                'margin_pct': round(m['margin'] / m['client_gross'] * 100, 1) if m['client_gross'] > 0 else 0,
            })

        # --- Paystub counts ---
        total_paystubs = paystubs_resp.count or 0
        recent_paystubs = sum(
            1 for p in (paystubs_resp.data or [])
            if p.get('created_at', '') >= thirty_days_ago
        )

        # --- Bank account flow ---
        admin_deposits = 0.0
        contractor_deposits = 0.0
        for s in (splits_resp.data or []):
            amt = float(s.get('amount') or 0)
            owner = s.get('bank_accounts', {}).get('owner_type', '')
            if owner == 'admin':
                admin_deposits += amt
            elif owner == 'contractor':
                contractor_deposits += amt

        # --- Derived metrics ---
        avg_hours = total_hours / len(earnings) if earnings else 0
        avg_earnings = total_contractor_earnings / len(earnings) if earnings else 0
        margin_pct = (total_margin / total_client_gross * 100) if total_client_gross > 0 else 0
        contractor_pct = (total_contractor_earnings / total_client_gross * 100) if total_client_gross > 0 else 0
        payment_rate = (total_paid / total_contractor_earnings * 100) if total_contractor_earnings > 0 else 0
        bonus_count = sum(1 for e in earnings if float(e.get('contractor_bonus_share') or 0) > 0)

        return {
            # Top-line KPIs
            "total_contractors": total_contractors,
            "active_contractors": active_contractors,
            "total_paystubs": total_paystubs,
            "recent_paystubs": recent_paystubs,

            # Financial overview
            "total_client_gross": round(total_client_gross, 2),
            "total_contractor_earnings": round(total_contractor_earnings, 2),
            "total_regular": round(total_regular, 2),
            "total_bonus": round(total_bonus, 2),
            "total_margin": round(total_margin, 2),
            "margin_pct": round(margin_pct, 1),
            "contractor_pct": round(contractor_pct, 1),

            # Payment status
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_pending, 2),
            "payment_rate": round(payment_rate, 1),
            "count_paid": count_paid,
            "count_partial": count_partial,
            "count_unpaid": count_unpaid,
            "bonus_count": bonus_count,

            # Hours
            "total_hours": round(total_hours, 2),
            "avg_hours_per_period": round(avg_hours, 1),
            "avg_earnings_per_period": round(avg_earnings, 2),

            # This month
            "this_month_earnings": round(this_month_earnings, 2),
            "this_month_hours": round(this_month_hours, 2),
            "this_month_margin": round(this_month_margin, 2),

            # Bank flow
            "admin_deposits": round(admin_deposits, 2),
            "contractor_deposits": round(contractor_deposits, 2),

            # Date range
            "earliest_period": earnings[0].get('pay_period_begin') if earnings else None,
            "latest_period": earnings[-1].get('pay_period_end') if earnings else None,

            # Monthly trend data (for charts)
            "monthly_trend": monthly_trend,

            # Legacy (kept for backwards compat)
            "total_unpaid": round(total_pending, 2),
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )


@router.get("/contractor")
async def get_contractor_dashboard(user: dict = Depends(verify_token)) -> Dict:
    """
    Get dashboard statistics for the logged-in contractor.
    Returns their own earnings, payment status, hours, and contract info.
    """
    try:
        contractor_id = get_contractor_id(user["user_id"])
        if not contractor_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No contractor profile linked to this account",
            )

        # Get contractor info
        contractor_resp = supabase_admin_client.table("contractors").select(
            "id, first_name, last_name, contractor_code, is_active"
        ).eq("id", contractor_id).single().execute()
        contractor = contractor_resp.data

        # Get active assignment(s) with client info
        assignments_resp = supabase_admin_client.table("contractor_assignments").select(
            "id, fixed_hourly_rate, bonus_split_percentage, is_active, client_company_id, "
            "client_companies(name, code)"
        ).eq("contractor_id", contractor_id).eq("is_active", True).execute()
        assignments = assignments_resp.data or []

        # Get all earnings for this contractor
        assignment_ids = [a["id"] for a in assignments]
        earnings = []
        if assignment_ids:
            earnings_resp = supabase_admin_client.table("contractor_earnings").select(
                "pay_period_begin, pay_period_end, client_gross_pay, client_total_hours, "
                "contractor_regular_earnings, contractor_bonus_share, contractor_total_earnings, "
                "amount_paid, amount_pending, payment_status, variance_status"
            ).in_("contractor_assignment_id", assignment_ids).order("pay_period_begin").execute()
            earnings = earnings_resp.data or []

        # Get latest contract status
        contract_resp = supabase_admin_client.table("contracts").select(
            "id, status, contract_type, version, created_at"
        ).eq("contractor_id", contractor_id).order("created_at", desc=True).limit(1).execute()
        latest_contract = contract_resp.data[0] if contract_resp.data else None

        # Aggregate earnings
        now = datetime.now()
        first_of_month = now.replace(day=1).date().isoformat()

        total_earnings = 0.0
        total_regular = 0.0
        total_bonus = 0.0
        total_paid = 0.0
        total_pending = 0.0
        total_hours = 0.0
        count_paid = 0
        count_unpaid = 0
        this_month_earnings = 0.0
        this_month_hours = 0.0
        monthly_data: Dict[str, Dict] = {}

        for e in earnings:
            earn = float(e.get("contractor_total_earnings") or 0)
            regular = float(e.get("contractor_regular_earnings") or 0)
            bonus = float(e.get("contractor_bonus_share") or 0)
            paid = float(e.get("amount_paid") or 0)
            pending = float(e.get("amount_pending") or 0)
            hours = float(e.get("client_total_hours") or 0)
            pay_status = e.get("payment_status", "unpaid")
            period_begin = e.get("pay_period_begin", "")
            period_end = e.get("pay_period_end", "")

            total_earnings += earn
            total_regular += regular
            total_bonus += bonus
            total_paid += paid
            total_pending += pending
            total_hours += hours

            if pay_status == "paid":
                count_paid += 1
            else:
                count_unpaid += 1

            if period_end >= first_of_month:
                this_month_earnings += earn
                this_month_hours += hours

            month_key = period_begin[:7] if period_begin else "unknown"
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    "month": month_key, "hours": 0.0, "earnings": 0.0,
                    "regular": 0.0, "bonus": 0.0, "paid": 0.0, "pending": 0.0,
                }
            m = monthly_data[month_key]
            m["hours"] += hours
            m["earnings"] += earn
            m["regular"] += regular
            m["bonus"] += bonus
            m["paid"] += paid
            m["pending"] += pending

        monthly_trend = []
        for key in sorted(monthly_data.keys()):
            m = monthly_data[key]
            monthly_trend.append({k: round(v, 2) if isinstance(v, float) else v for k, v in m.items()})

        # Build assignment info for display
        assignment_info = []
        for a in assignments:
            client = a.get("client_companies") or {}
            assignment_info.append({
                "client_name": client.get("name", "Unknown"),
                "client_code": client.get("code"),
                "hourly_rate": float(a.get("fixed_hourly_rate") or 0),
                "bonus_percentage": float(a.get("bonus_split_percentage") or 0),
            })

        payment_rate = (total_paid / total_earnings * 100) if total_earnings > 0 else 0

        return {
            "contractor_name": f"{contractor.get('first_name', '')} {contractor.get('last_name', '')}".strip(),
            "contractor_code": contractor.get("contractor_code"),

            # Assignment
            "assignments": assignment_info,

            # Contract
            "contract": {
                "id": latest_contract["id"],
                "status": latest_contract["status"],
                "type": latest_contract["contract_type"],
                "version": latest_contract["version"],
            } if latest_contract else None,

            # Earnings summary
            "total_earnings": round(total_earnings, 2),
            "total_regular": round(total_regular, 2),
            "total_bonus": round(total_bonus, 2),
            "total_hours": round(total_hours, 2),
            "total_pay_periods": len(earnings),

            # Payment
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_pending, 2),
            "payment_rate": round(payment_rate, 1),
            "count_paid": count_paid,
            "count_unpaid": count_unpaid,

            # This month
            "this_month_earnings": round(this_month_earnings, 2),
            "this_month_hours": round(this_month_hours, 2),

            # Date range
            "earliest_period": earnings[0].get("pay_period_begin") if earnings else None,
            "latest_period": earnings[-1].get("pay_period_end") if earnings else None,

            # Monthly trend
            "monthly_trend": monthly_trend,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contractor dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contractor dashboard: {str(e)}",
        )
