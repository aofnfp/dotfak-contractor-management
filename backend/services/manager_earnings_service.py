"""
Manager earnings service - auto-calculates manager earnings when staff paystubs are uploaded.

Manager pay is simple: total_staff_hours x flat_hourly_rate (NO overtime multipliers).
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
import logging

from backend.config import supabase_admin_client
from backend.services.earnings_service import EarningsCalculator

logger = logging.getLogger(__name__)


def _get_staff_total_hours(paystub_data: Dict[str, Any]) -> float:
    """
    Extract total non-supplemental hours from paystub data.
    Reuses the same logic as contractor earnings to avoid double-counting.
    """
    earnings_list = paystub_data.get('earnings', [])
    regular_earnings, _ = EarningsCalculator.identify_bonuses(earnings_list)

    total_hours = sum(
        Decimal(str(e.get('hours', 0))) for e in regular_earnings
        if not any(kw in e.get('description', '').lower()
                   for kw in EarningsCalculator.SUPPLEMENTAL_HOUR_KEYWORDS)
    )

    return float(total_hours)


def calculate_manager_earnings(paystub_id: int) -> List[Dict[str, Any]]:
    """
    Calculate and upsert manager earnings for a given paystub.

    1. Get paystub -> find contractor_assignment_id
    2. Find active manager_assignments for that contractor_assignment
    3. For each: total_earnings = staff_total_hours x flat_hourly_rate
    4. Upsert into manager_earnings

    Args:
        paystub_id: ID of the uploaded paystub

    Returns:
        List of created/updated manager_earnings records
    """
    try:
        # Step 1: Get paystub and its contractor_assignment_id
        paystub_result = supabase_admin_client.table("paystubs").select(
            "id, contractor_assignment_id, pay_period_begin, pay_period_end, paystub_data"
        ).eq("id", paystub_id).execute()

        if not paystub_result.data:
            logger.warning(f"Paystub {paystub_id} not found for manager earnings calculation")
            return []

        paystub = paystub_result.data[0]
        contractor_assignment_id = paystub.get("contractor_assignment_id")

        if not contractor_assignment_id:
            logger.debug(f"Paystub {paystub_id} has no contractor_assignment_id, skipping manager earnings")
            return []

        # Step 2: Find active manager_assignments for this contractor_assignment
        ma_result = supabase_admin_client.table("manager_assignments").select(
            "id, manager_id, flat_hourly_rate"
        ).eq("contractor_assignment_id", contractor_assignment_id).eq("is_active", True).execute()

        if not ma_result.data:
            logger.debug(f"No active manager assignments for contractor_assignment {contractor_assignment_id}")
            return []

        # Step 3: Calculate hours from paystub data
        paystub_data = paystub.get("paystub_data", {})
        staff_total_hours = _get_staff_total_hours(paystub_data)

        if staff_total_hours <= 0:
            logger.warning(f"Paystub {paystub_id} has 0 hours, skipping manager earnings")
            return []

        # Step 4: Calculate and upsert earnings for each manager
        results = []
        for ma in ma_result.data:
            flat_rate = Decimal(str(ma["flat_hourly_rate"]))
            hours = Decimal(str(staff_total_hours))
            total = (hours * flat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            earnings_data = {
                "manager_id": ma["manager_id"],
                "manager_assignment_id": ma["id"],
                "paystub_id": paystub_id,
                "contractor_assignment_id": contractor_assignment_id,
                "pay_period_begin": paystub.get("pay_period_begin"),
                "pay_period_end": paystub.get("pay_period_end"),
                "staff_total_hours": float(hours),
                "flat_hourly_rate": float(flat_rate),
                "total_earnings": float(total),
                "amount_paid": 0,
                "amount_pending": float(total),
                "payment_status": "unpaid",
            }

            # Upsert using the unique constraint (manager_assignment_id, paystub_id)
            result = supabase_admin_client.table("manager_earnings").upsert(
                earnings_data,
                on_conflict="manager_assignment_id,paystub_id"
            ).execute()

            if result.data:
                record = result.data[0]
                results.append(record)
                logger.info(
                    f"Manager earnings calculated: manager_assignment={ma['id']}, "
                    f"paystub={paystub_id}, hours={staff_total_hours}, "
                    f"rate=${flat_rate}, total=${total}"
                )

        return results

    except Exception as e:
        logger.error(f"Failed to calculate manager earnings for paystub {paystub_id}: {str(e)}")
        return []
