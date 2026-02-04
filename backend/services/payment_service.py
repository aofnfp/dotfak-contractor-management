#!/usr/bin/env python3
"""
Payment service - handles payment recording and allocation to earnings.

Implements FIFO (First In, First Out) allocation:
- Oldest unpaid earnings get paid first
- Payments can be split across multiple earnings
- Earnings payment status auto-updated (unpaid → partially_paid → paid)
"""

from typing import Dict, List, Any, Optional
from decimal import Decimal, ROUND_HALF_UP
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for recording payments and allocating to earnings."""

    @staticmethod
    def get_unpaid_earnings(contractor_id: str) -> List[Dict]:
        """
        Get unpaid/partially paid earnings for a contractor, ordered by date (FIFO).

        Args:
            contractor_id: Contractor UUID

        Returns:
            List of earnings with pending amounts
        """
        try:
            # Get all assignments for this contractor
            assignments = supabase_admin_client.table("contractor_assignments").select("id").eq(
                "contractor_id", contractor_id
            ).execute()

            if not assignments.data:
                return []

            assignment_ids = [a['id'] for a in assignments.data]

            # Get unpaid/partially paid earnings
            earnings = supabase_admin_client.table("contractor_earnings").select("*").in_(
                "contractor_assignment_id", assignment_ids
            ).in_("payment_status", ["unpaid", "partially_paid"]).order(
                "pay_period_begin", desc=False  # Oldest first (FIFO)
            ).execute()

            return earnings.data if earnings.data else []

        except Exception as e:
            logger.error(f"Error fetching unpaid earnings: {str(e)}")
            raise

    @staticmethod
    def allocate_payment_fifo(
        payment_amount: Decimal,
        earnings_list: List[Dict]
    ) -> List[Dict]:
        """
        Allocate payment to earnings using FIFO (oldest first).

        Args:
            payment_amount: Total payment amount to allocate
            earnings_list: List of earnings (ordered by date, oldest first)

        Returns:
            List of allocations: [{'earning_id': 'uuid', 'amount': 100.00}, ...]
        """
        allocations = []
        remaining = payment_amount

        for earning in earnings_list:
            if remaining <= 0:
                break

            pending = Decimal(str(earning['amount_pending']))

            if pending <= 0:
                continue

            # Allocate up to the pending amount
            allocation_amount = min(remaining, pending)

            allocations.append({
                'earning_id': earning['id'],
                'amount': float(allocation_amount)
            })

            remaining -= allocation_amount

            logger.info(f"Allocated ${allocation_amount} to earning {earning['id']}")

        if remaining > 0:
            logger.warning(f"Payment fully allocated with ${remaining} remaining (no more unpaid earnings)")

        return allocations

    @staticmethod
    def record_payment(
        contractor_id: str,
        amount: float,
        payment_method: Optional[str],
        payment_date: str,
        transaction_reference: Optional[str],
        notes: Optional[str],
        recorded_by: str,
        manual_allocations: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Record a payment and allocate to earnings.

        Args:
            contractor_id: Contractor UUID
            amount: Payment amount
            payment_method: Payment method
            payment_date: Payment date
            transaction_reference: Transaction ID
            notes: Optional notes
            recorded_by: User ID who recorded payment
            manual_allocations: Optional manual allocation specification

        Returns:
            Payment record with allocations
        """
        try:
            payment_amount = Decimal(str(amount))

            # Step 1: Create payment record
            payment_data = {
                'contractor_id': contractor_id,
                'amount': amount,
                'payment_method': payment_method,
                'payment_date': payment_date,
                'transaction_reference': transaction_reference,
                'notes': notes,
                'recorded_by': recorded_by
            }

            payment_result = supabase_admin_client.table("contractor_payments").insert(
                payment_data
            ).execute()

            if not payment_result.data:
                raise Exception("Failed to create payment record")

            payment = payment_result.data[0]
            payment_id = payment['id']

            logger.info(f"Payment recorded: {payment_id} - ${amount}")

            # Step 2: Determine allocations
            if manual_allocations:
                # Use manual allocations if provided
                allocations = manual_allocations
                logger.info("Using manual allocations")
            else:
                # Auto-allocate using FIFO
                unpaid_earnings = PaymentService.get_unpaid_earnings(contractor_id)
                allocations = PaymentService.allocate_payment_fifo(payment_amount, unpaid_earnings)
                logger.info(f"Auto-allocated to {len(allocations)} earning(s) using FIFO")

            # Step 3: Save allocations and update earnings
            allocation_records = []

            for alloc in allocations:
                earning_id = alloc['earning_id']
                alloc_amount = Decimal(str(alloc['amount']))

                # Save allocation
                allocation_data = {
                    'payment_id': payment_id,
                    'earning_id': earning_id,
                    'amount_allocated': float(alloc_amount)
                }

                alloc_result = supabase_admin_client.table("payment_allocations").insert(
                    allocation_data
                ).execute()

                if alloc_result.data:
                    allocation_records.append(alloc_result.data[0])

                # Update earning payment status
                PaymentService.update_earning_payment_status(earning_id, float(alloc_amount))

            payment['allocations'] = allocation_records

            logger.info(f"✅ Payment complete: ${amount} allocated to {len(allocation_records)} earning(s)")
            return payment

        except Exception as e:
            logger.error(f"Error recording payment: {str(e)}")
            raise

    @staticmethod
    def update_earning_payment_status(earning_id: str, allocation_amount: float):
        """
        Update earning payment status based on new allocation.

        Args:
            earning_id: Earning UUID
            allocation_amount: Amount being allocated
        """
        try:
            # Get current earning
            earning_result = supabase_admin_client.table("contractor_earnings").select("*").eq(
                "id", earning_id
            ).execute()

            if not earning_result.data:
                raise Exception(f"Earning {earning_id} not found")

            earning = earning_result.data[0]

            # Calculate new paid amount
            current_paid = Decimal(str(earning['amount_paid']))
            new_paid = current_paid + Decimal(str(allocation_amount))
            total_earnings = Decimal(str(earning['contractor_total_earnings']))
            new_pending = total_earnings - new_paid

            # Determine new status
            if new_pending <= 0:
                new_status = 'paid'
            elif new_paid > 0:
                new_status = 'partially_paid'
            else:
                new_status = 'unpaid'

            # Update earning
            update_data = {
                'amount_paid': float(new_paid),
                'amount_pending': float(new_pending),
                'payment_status': new_status
            }

            supabase_admin_client.table("contractor_earnings").update(update_data).eq(
                "id", earning_id
            ).execute()

            logger.info(f"Earning {earning_id} updated: {new_status}, paid=${new_paid}, pending=${new_pending}")

        except Exception as e:
            logger.error(f"Error updating earning status: {str(e)}")
            raise

    @staticmethod
    def get_earnings_summary(contractor_id: str) -> Dict:
        """
        Get earnings summary for a contractor.

        Args:
            contractor_id: Contractor UUID

        Returns:
            Summary with total earned, paid, pending
        """
        try:
            # Get all assignments for contractor
            assignments = supabase_admin_client.table("contractor_assignments").select("id").eq(
                "contractor_id", contractor_id
            ).execute()

            if not assignments.data:
                return {
                    'total_earned': 0.0,
                    'total_paid': 0.0,
                    'total_pending': 0.0,
                    'earnings_count': 0,
                    'oldest_unpaid_date': None
                }

            assignment_ids = [a['id'] for a in assignments.data]

            # Get all earnings
            earnings = supabase_admin_client.table("contractor_earnings").select("*").in_(
                "contractor_assignment_id", assignment_ids
            ).execute()

            if not earnings.data:
                return {
                    'total_earned': 0.0,
                    'total_paid': 0.0,
                    'total_pending': 0.0,
                    'earnings_count': 0,
                    'oldest_unpaid_date': None
                }

            # Calculate totals
            total_earned = sum(Decimal(str(e['contractor_total_earnings'])) for e in earnings.data)
            total_paid = sum(Decimal(str(e['amount_paid'])) for e in earnings.data)
            total_pending = sum(Decimal(str(e['amount_pending'])) for e in earnings.data)

            # Find oldest unpaid
            unpaid = [e for e in earnings.data if e['payment_status'] in ['unpaid', 'partially_paid']]
            oldest_unpaid_date = min((e['pay_period_begin'] for e in unpaid), default=None)

            return {
                'total_earned': float(total_earned),
                'total_paid': float(total_paid),
                'total_pending': float(total_pending),
                'earnings_count': len(earnings.data),
                'oldest_unpaid_date': oldest_unpaid_date
            }

        except Exception as e:
            logger.error(f"Error calculating earnings summary: {str(e)}")
            raise
