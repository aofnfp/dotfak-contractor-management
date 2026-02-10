#!/usr/bin/env python3
"""
Earnings calculation service - calculates contractor earnings from paystub data.

CRITICAL BUSINESS LOGIC:
- Bonuses are SEPARATE LINE ITEMS in earnings array (not calculated from totals)
- "Overtime Premium" is REGULAR earnings (not a bonus)
- "Education Differential" is REGULAR earnings (not a bonus)
- Contractor's bonus share is configurable per assignment
"""

from typing import Dict, List, Any, Optional
from decimal import Decimal, ROUND_HALF_UP
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)


class EarningsCalculator:
    """Calculate contractor earnings from paystub data and assignment rate structure."""

    # Keywords that identify BONUS line items
    BONUS_KEYWORDS = [
        'bonus',
        'incentive',
        'commission',
        'retention',
        'referral',
        'award',
        'stipend',
        'gift card',
        'gift'
    ]

    # Keywords that identify REGULAR earnings (not bonuses)
    REGULAR_KEYWORDS = [
        'regular',
        'overtime',
        'overtime premium',
        'education differential',
        'shift differential',
        'holiday',
        'vacation',
        'sick',
        'pto',
        'personal time'
    ]

    # Supplemental earning types that duplicate hours from base lines.
    # Their dollar amounts count, but their hours must NOT be summed
    # (e.g., "Overtime Premium" reuses Overtime hours, "Education Differential"
    # reuses all hours as a per-hour bonus).
    SUPPLEMENTAL_HOUR_KEYWORDS = [
        'premium',
        'differential',
        'group term life',
        'gtl',
        'gross up',
    ]

    @staticmethod
    def _get_base_rate(earnings_list: List[Dict]) -> Optional[Decimal]:
        """Extract the base hourly rate from the 'Regular' earning line."""
        for e in earnings_list:
            if 'regular' in e.get('description', '').lower():
                rate = e.get('rate', 0)
                if rate and float(rate) > 0:
                    return Decimal(str(rate))
        return None

    @staticmethod
    def _has_overtime_premium(earnings_list: List[Dict]) -> bool:
        """Check if there's an Overtime Premium companion line."""
        return any(
            'overtime premium' in e.get('description', '').lower()
            for e in earnings_list
        )

    @staticmethod
    def _get_earning_multiplier(
        description: str,
        rate: Decimal,
        base_rate: Optional[Decimal],
        has_ot_premium: bool
    ) -> Optional[Decimal]:
        """
        Determine the rate multiplier for an earning line.

        Mirrors the client company's pay structure:
        - Regular: 1.0x
        - Overtime (with premium companion): 1.5x (time and a half)
        - Holiday/Vacation/etc: derived from rate vs base rate
        - Supplemental lines (Premium, Differential, GTL): skipped (returns None)

        Returns None for lines that should be skipped (supplemental).
        """
        desc = description.lower()

        # Skip supplemental lines — they don't contribute independent hours
        if any(kw in desc for kw in EarningsCalculator.SUPPLEMENTAL_HOUR_KEYWORDS):
            return None

        # Overtime with premium companion = time and a half
        if 'overtime' in desc:
            if has_ot_premium:
                return Decimal('1.5')
            # No premium line — derive from rate comparison
            if base_rate and base_rate > 0 and rate and rate > 0:
                raw = rate / base_rate
                return (raw * 2).quantize(Decimal('1'), rounding=ROUND_HALF_UP) / 2
            return Decimal('1.5')  # Default OT

        # Double time
        if 'double time' in desc:
            return Decimal('2.0')

        # For other earning types (Regular, Holiday, Vacation, Sick, PTO)
        # Compare rate to base rate
        if base_rate and base_rate > 0 and rate and rate > 0:
            raw = rate / base_rate
            # Round to nearest 0.5 (handles 1.0, 1.5, 2.0)
            return (raw * 2).quantize(Decimal('1'), rounding=ROUND_HALF_UP) / 2

        return Decimal('1.0')  # Default

    @staticmethod
    def identify_bonuses(earnings_list: List[Dict]) -> tuple[List[Dict], List[Dict]]:
        """
        Identify bonus vs regular earnings from earnings list.

        Args:
            earnings_list: List of earning items from paystub

        Returns:
            Tuple of (regular_earnings, bonuses)
        """
        bonuses = []
        regular_earnings = []

        for earning in earnings_list:
            description = earning.get('description', '').lower()

            # First check if it's explicitly a regular earning
            if any(keyword in description for keyword in EarningsCalculator.REGULAR_KEYWORDS):
                regular_earnings.append(earning)
            # Then check if it's a bonus
            elif any(keyword in description for keyword in EarningsCalculator.BONUS_KEYWORDS):
                bonuses.append(earning)
            else:
                # If unclear, treat as regular earnings (safer assumption)
                regular_earnings.append(earning)
                logger.warning(f"Unclear earning type: '{earning.get('description')}' - treating as regular")

        return regular_earnings, bonuses

    @staticmethod
    def calculate_earnings(
        paystub_data: Dict[str, Any],
        assignment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate contractor earnings from paystub data and assignment.

        Args:
            paystub_data: Complete paystub data (from parser)
            assignment: Contractor assignment with rate structure

        Returns:
            Dictionary with earnings breakdown
        """
        try:
            # Extract data from paystub
            client_gross = Decimal(str(paystub_data['summary']['current']['gross_pay']))
            earnings_list = paystub_data.get('earnings', [])

            # Identify bonuses vs regular earnings
            regular_earnings, bonuses = EarningsCalculator.identify_bonuses(earnings_list)

            # Calculate totals
            bonus_total = sum(Decimal(str(b.get('amount', 0))) for b in bonuses)
            regular_total = sum(Decimal(str(r.get('amount', 0))) for r in regular_earnings)
            # Only count hours from base earning lines — exclude supplemental lines
            # (Premium, Differential, etc.) that duplicate hours from base lines
            total_hours = sum(
                Decimal(str(e.get('hours', 0))) for e in regular_earnings
                if not any(kw in e.get('description', '').lower()
                           for kw in EarningsCalculator.SUPPLEMENTAL_HOUR_KEYWORDS)
            )

            logger.info(f"Paystub breakdown - Regular: ${regular_total}, Bonuses: ${bonus_total}, Hours: {total_hours}")

            # Calculate contractor's regular earnings based on rate type
            rate_type = assignment['rate_type']
            earnings_breakdown = []
            client_base_rate = None

            if rate_type == 'fixed':
                # Fixed hourly rate with per-line multipliers
                # Mirrors the client company's pay structure (e.g., 1.5x for overtime)
                fixed_rate = Decimal(str(assignment['fixed_hourly_rate']))

                # Determine base rate and OT premium pattern from client paystub
                base_rate = EarningsCalculator._get_base_rate(earnings_list)
                client_base_rate = float(base_rate) if base_rate else None
                has_ot_premium = EarningsCalculator._has_overtime_premium(earnings_list)

                contractor_regular = Decimal('0')
                earnings_breakdown = []

                for e in regular_earnings:
                    hours = Decimal(str(e.get('hours', 0)))
                    rate = Decimal(str(e.get('rate', 0)))
                    desc = e.get('description', '')

                    if hours <= 0:
                        continue

                    multiplier = EarningsCalculator._get_earning_multiplier(
                        desc, rate, base_rate, has_ot_premium
                    )
                    if multiplier is None:
                        continue  # Skip supplemental lines

                    line_pay = (hours * fixed_rate * multiplier).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    contractor_regular += line_pay

                    earnings_breakdown.append({
                        'description': desc,
                        'hours': float(hours),
                        'multiplier': float(multiplier),
                        'contractor_rate': float((fixed_rate * multiplier).quantize(
                            Decimal('0.01'), rounding=ROUND_HALF_UP
                        )),
                        'amount': float(line_pay),
                    })

                logger.info(
                    f"Fixed rate calculation: base=${fixed_rate}/hr, "
                    f"breakdown={earnings_breakdown}, total=${contractor_regular}"
                )

            elif rate_type == 'percentage':
                # Percentage of regular earnings only (not bonuses)
                percentage = Decimal(str(assignment['percentage_rate']))
                contractor_regular = (regular_total * percentage / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                logger.info(f"Percentage calculation: ${regular_total} × {percentage}% = ${contractor_regular}")

            else:
                raise ValueError(f"Invalid rate_type: {rate_type}")

            # Calculate contractor's bonus share (configurable per contractor)
            bonus_split = Decimal(str(assignment.get('bonus_split_percentage', 50)))
            contractor_bonus = (bonus_total * bonus_split / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            if contractor_bonus > 0:
                logger.info(f"Bonus calculation: ${bonus_total} × {bonus_split}% = ${contractor_bonus}")

            # Calculate totals
            contractor_total_earnings = contractor_regular + contractor_bonus
            company_margin = client_gross - contractor_total_earnings

            # Build earnings breakdown
            earnings = {
                'client_gross_pay': float(client_gross),
                'client_total_hours': float(total_hours),
                'contractor_regular_earnings': float(contractor_regular),
                'contractor_bonus_share': float(contractor_bonus),
                'contractor_total_earnings': float(contractor_total_earnings),
                'company_margin': float(company_margin),
                'payment_status': 'unpaid',
                'amount_paid': 0.00,
                'amount_pending': float(contractor_total_earnings),
                # Metadata for debugging/audit
                'calculation_details': {
                    'rate_type': rate_type,
                    'rate_value': float(assignment.get('fixed_hourly_rate') or assignment.get('percentage_rate')),
                    'bonus_split_percentage': float(bonus_split),
                    'regular_earnings_count': len(regular_earnings),
                    'bonus_count': len(bonuses),
                    'regular_total': float(regular_total),
                    'bonus_total': float(bonus_total),
                    'earnings_breakdown': earnings_breakdown,
                    'client_base_rate': client_base_rate,
                }
            }

            logger.info(f"Final earnings - Contractor: ${contractor_total_earnings}, Company: ${company_margin}")
            return earnings

        except KeyError as e:
            logger.error(f"Missing required field in paystub or assignment: {e}")
            raise ValueError(f"Invalid paystub or assignment data: missing {e}")
        except Exception as e:
            logger.error(f"Earnings calculation failed: {str(e)}")
            raise


    @staticmethod
    def calculate_earnings_with_dual_tracking(
        paystub_id: int,
        paystub_data: Dict[str, Any],
        assignment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate earnings with DUAL TRACKING: expected (calculated) vs actual (from bank accounts).

        This method:
        1. Calculates EXPECTED earnings using hours × rate + bonuses
        2. Gets ACTUAL payments from paystub_account_splits (bank account deposits)
        3. Calculates VARIANCE (actual - expected)
        4. Determines variance status (correct, overpaid, underpaid)

        Args:
            paystub_id: ID of the paystub
            paystub_data: Complete paystub data (from parser)
            assignment: Contractor assignment with rate structure

        Returns:
            Dictionary with dual tracking earnings (expected + actual + variance)
        """
        try:
            # Step 1: Calculate EXPECTED earnings using existing logic
            expected_earnings = EarningsCalculator.calculate_earnings(paystub_data, assignment)

            # Step 2: Get ACTUAL payments from paystub_account_splits
            # Query paystub_account_splits joined with bank_accounts
            splits_result = supabase_admin_client.table("paystub_account_splits").select(
                "*, bank_accounts(*)"
            ).eq("paystub_id", paystub_id).execute()

            contractor_actual = Decimal('0.00')
            admin_actual = Decimal('0.00')

            if splits_result.data:
                for split in splits_result.data:
                    bank_account = split.get('bank_accounts', {})
                    owner_type = bank_account.get('owner_type')
                    amount = Decimal(str(split.get('amount', 0)))

                    if owner_type == 'contractor':
                        contractor_actual += amount
                    elif owner_type == 'admin':
                        admin_actual += amount

            # Step 3: Calculate VARIANCE
            expected_total = Decimal(str(expected_earnings['contractor_total_earnings']))
            payment_variance = contractor_actual - expected_total

            # Step 4: Determine variance status (allow 1 cent tolerance for rounding)
            if abs(payment_variance) <= Decimal('0.01'):
                variance_status = 'correct'
            elif payment_variance > Decimal('0.01'):
                variance_status = 'overpaid'
            else:
                variance_status = 'underpaid'

            # Log variance if significant
            if variance_status != 'correct':
                logger.warning(
                    f"Payment variance detected for paystub {paystub_id}: "
                    f"Expected ${expected_total}, Actual ${contractor_actual}, "
                    f"Variance ${payment_variance} ({variance_status})"
                )

            # Step 5: Build dual tracking earnings response
            dual_tracking_earnings = {
                # Expected earnings (calculated from rate)
                'expected_earnings': float(expected_total),
                'contractor_regular_earnings': expected_earnings['contractor_regular_earnings'],
                'contractor_bonus_share': expected_earnings['contractor_bonus_share'],

                # Actual payments (from bank account deposits)
                'actual_payments': float(contractor_actual),
                'admin_actual_payments': float(admin_actual),

                # Variance tracking
                'payment_variance': float(payment_variance),
                'variance_status': variance_status,

                # Other fields (from expected calculation)
                'client_gross_pay': expected_earnings['client_gross_pay'],
                'client_total_hours': expected_earnings['client_total_hours'],
                'company_margin': expected_earnings['company_margin'],  # Based on expected

                # Payment status (use actual for pending)
                'payment_status': 'unpaid',
                'amount_paid': 0.00,
                'amount_pending': float(contractor_actual),  # Use actual, not expected

                # Metadata
                'calculation_details': expected_earnings['calculation_details']
            }

            return dual_tracking_earnings

        except Exception as e:
            logger.error(f"Dual tracking calculation failed for paystub {paystub_id}: {str(e)}")
            raise

    @staticmethod
    def validate_earnings(earnings: Dict[str, Any]) -> bool:
        """
        Validate calculated earnings for sanity checks.

        Args:
            earnings: Calculated earnings

        Returns:
            True if valid, raises ValueError if invalid
        """
        client_gross = Decimal(str(earnings['client_gross_pay']))
        contractor_total = Decimal(str(earnings['contractor_total_earnings']))
        company_margin = Decimal(str(earnings['company_margin']))

        # Sanity check: contractor + company should equal client gross
        total_check = contractor_total + company_margin
        if abs(total_check - client_gross) > Decimal('0.02'):  # Allow 2 cent rounding difference
            raise ValueError(
                f"Earnings don't add up: contractor (${contractor_total}) + "
                f"company (${company_margin}) ≠ client gross (${client_gross})"
            )

        # Contractor earnings should be positive
        if contractor_total <= 0:
            raise ValueError(f"Contractor earnings must be positive, got ${contractor_total}")

        # Company margin should typically be positive (but warn if negative)
        if company_margin < 0:
            logger.warning(f"⚠️  Negative company margin: ${company_margin}")

        return True


def calculate_contractor_earnings(
    paystub_data: Dict[str, Any],
    assignment: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function to calculate and validate contractor earnings.

    Args:
        paystub_data: Complete paystub data
        assignment: Contractor assignment with rate structure

    Returns:
        Validated earnings breakdown
    """
    calculator = EarningsCalculator()
    earnings = calculator.calculate_earnings(paystub_data, assignment)
    calculator.validate_earnings(earnings)
    return earnings


def calculate_contractor_earnings_with_dual_tracking(
    paystub_id: int,
    paystub_data: Dict[str, Any],
    assignment: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function to calculate earnings with dual tracking (expected vs actual).

    This function:
    1. Calculates expected earnings from hours × rate
    2. Gets actual payments from bank account deposits
    3. Calculates variance and flags discrepancies

    Args:
        paystub_id: ID of the paystub
        paystub_data: Complete paystub data
        assignment: Contractor assignment with rate structure

    Returns:
        Dual tracking earnings breakdown with variance status
    """
    calculator = EarningsCalculator()
    earnings = calculator.calculate_earnings_with_dual_tracking(paystub_id, paystub_data, assignment)
    return earnings
