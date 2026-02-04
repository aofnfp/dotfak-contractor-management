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
        'stipend'
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
            total_hours = sum(Decimal(str(e.get('hours', 0))) for e in regular_earnings)

            logger.info(f"Paystub breakdown - Regular: ${regular_total}, Bonuses: ${bonus_total}, Hours: {total_hours}")

            # Calculate contractor's regular earnings based on rate type
            rate_type = assignment['rate_type']

            if rate_type == 'fixed':
                # Fixed hourly rate (e.g., $4/hr)
                fixed_rate = Decimal(str(assignment['fixed_hourly_rate']))
                contractor_regular = (total_hours * fixed_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                logger.info(f"Fixed rate calculation: {total_hours} hrs × ${fixed_rate}/hr = ${contractor_regular}")

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
                    'bonus_total': float(bonus_total)
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
