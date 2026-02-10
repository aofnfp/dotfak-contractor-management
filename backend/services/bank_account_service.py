#!/usr/bin/env python3
"""
Bank account service - handles account matching, assignment, and tracking.

This service implements the core logic for:
1. Checking if paystub accounts have been seen before (auto-matching)
2. Assigning new accounts to owners (contractor or admin)
3. Creating paystub_account_splits entries
"""

import logging
from typing import Dict, List, Optional, Any
from decimal import Decimal
from uuid import UUID

from backend.config import supabase_admin_client
from backend.schemas.bank_account import (
    CheckAccountsResponse,
    UnassignedAccountInfo,
    AccountAssignmentResponse,
)

logger = logging.getLogger(__name__)


class BankAccountService:
    """Service for bank account operations."""

    @staticmethod
    def check_paystub_accounts(paystub_id: int) -> CheckAccountsResponse:
        """
        Check if paystub has unassigned accounts.

        For each account in paystub_data['payment_info']:
        - If account_last4 exists in bank_accounts table → auto-assign by creating paystub_account_split
        - If account_last4 is NEW → add to unassigned list for manual assignment

        Args:
            paystub_id: ID of the paystub to check

        Returns:
            CheckAccountsResponse with unassigned accounts list and needs_assignment flag

        Raises:
            ValueError: If paystub not found
        """
        try:
            # Step 1: Get paystub data
            paystub_result = supabase_admin_client.table("paystubs").select("*").eq(
                "id", paystub_id
            ).execute()

            if not paystub_result.data or len(paystub_result.data) == 0:
                raise ValueError(f"Paystub {paystub_id} not found")

            paystub = paystub_result.data[0]
            paystub_data = paystub.get("paystub_data", {})
            payment_info = paystub_data.get("payment_info", [])

            if not payment_info:
                logger.warning(f"Paystub {paystub_id} has no payment_info")
                return CheckAccountsResponse(
                    paystub_id=paystub_id,
                    total_accounts=0,
                    assigned_accounts=0,
                    unassigned_accounts=[],
                    needs_assignment=False
                )

            # Step 2: Process each account
            unassigned_accounts = []
            assigned_count = 0

            for account_info in payment_info:
                # Extract last 4 digits from account number (e.g., "******5257" → "5257")
                account_number = account_info.get('account_number', '')
                if len(account_number) < 4:
                    logger.warning(f"Invalid account number format: {account_number}")
                    continue

                account_last4 = account_number[-4:]

                # Check if this account exists in bank_accounts table
                bank_account_result = supabase_admin_client.table("bank_accounts").select("*").eq(
                    "account_last4", account_last4
                ).eq("is_active", True).execute()

                if bank_account_result.data and len(bank_account_result.data) > 0:
                    # ✅ Account exists → Auto-assign by creating paystub_account_split
                    existing_account = bank_account_result.data[0]

                    # Check if split already exists (avoid duplicates)
                    existing_split = supabase_admin_client.table("paystub_account_splits").select("*").eq(
                        "paystub_id", paystub_id
                    ).eq("bank_account_id", existing_account['id']).execute()

                    if not existing_split.data:
                        # Create split entry
                        split_data = {
                            "paystub_id": paystub_id,
                            "bank_account_id": existing_account['id'],
                            "amount": float(account_info.get('amount', 0)),
                            "currency": account_info.get('currency', 'USD')
                        }

                        supabase_admin_client.table("paystub_account_splits").insert(
                            split_data
                        ).execute()

                        logger.info(f"Auto-assigned account ****{account_last4} to paystub {paystub_id}")

                    assigned_count += 1

                else:
                    # ⚠️ NEW account → Needs manual assignment
                    unassigned_accounts.append(
                        UnassignedAccountInfo(
                            account_last4=account_last4,
                            bank_name=account_info.get('bank_name', 'Unknown'),
                            account_name=account_info.get('account_name', ''),
                            amount=Decimal(str(account_info.get('amount', 0))),
                            currency=account_info.get('currency', 'USD')
                        )
                    )

            # Step 3: Return results
            return CheckAccountsResponse(
                paystub_id=paystub_id,
                total_accounts=len(payment_info),
                assigned_accounts=assigned_count,
                unassigned_accounts=unassigned_accounts,
                needs_assignment=len(unassigned_accounts) > 0
            )

        except ValueError as e:
            # Re-raise ValueError (paystub not found)
            raise e
        except Exception as e:
            logger.error(f"Error checking paystub accounts: {str(e)}")
            raise RuntimeError(f"Failed to check accounts: {str(e)}")

    @staticmethod
    def assign_accounts(
        paystub_id: int,
        assignments: List[Dict[str, Any]]
    ) -> AccountAssignmentResponse:
        """
        Assign NEW accounts from a paystub to owners.

        Creates:
        1. bank_accounts entries (for new accounts)
        2. paystub_account_splits entries (linking paystub to accounts)

        Args:
            paystub_id: ID of the paystub
            assignments: List of dicts with {account_last4, owner_type, owner_id}

        Returns:
            AccountAssignmentResponse with count of assigned accounts

        Raises:
            ValueError: If paystub not found or account not found in paystub
            RuntimeError: For database errors
        """
        try:
            # Step 1: Get paystub data
            paystub_result = supabase_admin_client.table("paystubs").select("*").eq(
                "id", paystub_id
            ).execute()

            if not paystub_result.data or len(paystub_result.data) == 0:
                raise ValueError(f"Paystub {paystub_id} not found")

            paystub = paystub_result.data[0]
            paystub_data = paystub.get("paystub_data", {})
            payment_info = paystub_data.get("payment_info", [])

            assigned_count = 0

            # Step 2: Process each assignment
            for assignment in assignments:
                account_last4 = assignment['account_last4']
                owner_type = assignment['owner_type']
                owner_id = str(assignment['owner_id'])

                # Find account info in payment_info
                account_info = None
                for acc in payment_info:
                    if acc.get('account_number', '')[-4:] == account_last4:
                        account_info = acc
                        break

                if not account_info:
                    logger.warning(f"Account ****{account_last4} not found in paystub {paystub_id}")
                    continue

                # Step 3: Check if account already exists (shouldn't happen, but be safe)
                existing_account = supabase_admin_client.table("bank_accounts").select("*").eq(
                    "account_last4", account_last4
                ).execute()

                if existing_account.data and len(existing_account.data) > 0:
                    bank_account = existing_account.data[0]
                    logger.info(f"Account ****{account_last4} already exists, using existing")
                else:
                    # Step 4: Create new bank_account entry
                    bank_account_data = {
                        "account_last4": account_last4,
                        "bank_name": account_info.get('bank_name', 'Unknown'),
                        "account_name": account_info.get('account_name', ''),
                        "owner_type": owner_type,
                        "owner_id": owner_id,
                        "first_seen_paystub_id": paystub_id,
                        "is_active": True
                    }

                    bank_account_result = supabase_admin_client.table("bank_accounts").insert(
                        bank_account_data
                    ).execute()

                    if not bank_account_result.data or len(bank_account_result.data) == 0:
                        raise RuntimeError(f"Failed to create bank account for ****{account_last4}")

                    bank_account = bank_account_result.data[0]
                    logger.info(f"Created bank account ****{account_last4} (owner: {owner_type})")

                # Step 5: Create paystub_account_split entry
                split_data = {
                    "paystub_id": paystub_id,
                    "bank_account_id": bank_account['id'],
                    "amount": float(account_info.get('amount', 0)),
                    "currency": account_info.get('currency', 'USD')
                }

                # Check if split already exists
                existing_split = supabase_admin_client.table("paystub_account_splits").select("*").eq(
                    "paystub_id", paystub_id
                ).eq("bank_account_id", bank_account['id']).execute()

                if not existing_split.data:
                    supabase_admin_client.table("paystub_account_splits").insert(
                        split_data
                    ).execute()

                    logger.info(f"Created paystub_account_split: paystub {paystub_id} → account ****{account_last4}")

                assigned_count += 1

            # Step 6: Return success
            return AccountAssignmentResponse(
                paystub_id=paystub_id,
                assigned_count=assigned_count,
                success=True
            )

        except ValueError as e:
            # Re-raise ValueError (paystub/account not found)
            raise e
        except Exception as e:
            logger.error(f"Error assigning accounts: {str(e)}")
            raise RuntimeError(f"Failed to assign accounts: {str(e)}")

    @staticmethod
    def get_paystub_account_splits(paystub_id: int) -> List[Dict[str, Any]]:
        """
        Get account splits for a paystub with bank account details.

        Args:
            paystub_id: ID of the paystub

        Returns:
            List of splits with account details
        """
        try:
            # Query paystub_account_splits joined with bank_accounts
            result = supabase_admin_client.table("paystub_account_splits").select(
                "*, bank_accounts(*)"
            ).eq("paystub_id", paystub_id).execute()

            if not result.data:
                return []

            return result.data

        except Exception as e:
            logger.error(f"Error getting paystub account splits: {str(e)}")
            return []

    @staticmethod
    def get_all_bank_accounts(owner_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all registered bank accounts, optionally filtered by owner type.

        Args:
            owner_type: Optional filter for 'contractor' or 'admin'

        Returns:
            List of bank account records
        """
        try:
            query = supabase_admin_client.table("bank_accounts").select("*")

            if owner_type:
                query = query.eq("owner_type", owner_type)

            result = query.eq("is_active", True).order("created_at", desc=True).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting bank accounts: {str(e)}")
            return []

    @staticmethod
    def sync_earnings_payment_status(paystub_id: int) -> None:
        """
        Sync contractor_earnings payment fields from paystub_account_splits.

        Uses the contractor's bank deposit as the actual payment amount,
        compares to expected earnings, and sets variance/payment status.

        Should be called after account splits are created or updated.
        """
        try:
            # Get the earnings record for this paystub
            earnings_result = supabase_admin_client.table("contractor_earnings").select(
                "id, contractor_total_earnings"
            ).eq("paystub_id", paystub_id).execute()

            if not earnings_result.data:
                logger.debug(f"No earnings record for paystub {paystub_id}, skipping sync")
                return

            earning = earnings_result.data[0]
            expected = Decimal(str(earning['contractor_total_earnings']))

            # Get contractor's actual deposit from splits
            splits_result = supabase_admin_client.table("paystub_account_splits").select(
                "amount, bank_accounts!inner(owner_type)"
            ).eq("paystub_id", paystub_id).execute()

            contractor_deposit = Decimal('0')
            for split in splits_result.data or []:
                if split.get('bank_accounts', {}).get('owner_type') == 'contractor':
                    contractor_deposit += Decimal(str(split['amount']))

            # Calculate variance
            variance = contractor_deposit - expected

            if abs(variance) <= Decimal('0.01'):
                variance_status = 'correct'
            elif variance > 0:
                variance_status = 'overpaid'
            else:
                variance_status = 'underpaid'

            # Determine payment status
            if contractor_deposit >= expected - Decimal('0.01'):
                payment_status = 'paid'
            elif contractor_deposit > 0:
                payment_status = 'partially_paid'
            else:
                payment_status = 'unpaid'

            # Negative pending = overpaid (amount to deduct next period)
            pending = expected - contractor_deposit

            # Update the earnings record
            supabase_admin_client.table("contractor_earnings").update({
                'expected_earnings': float(expected),
                'actual_payments': float(contractor_deposit),
                'amount_paid': float(contractor_deposit),
                'amount_pending': float(pending),
                'payment_variance': float(variance),
                'variance_status': variance_status,
                'payment_status': payment_status,
            }).eq("id", earning['id']).execute()

            logger.info(
                f"Synced earnings for paystub {paystub_id}: "
                f"expected=${expected}, actual=${contractor_deposit}, "
                f"variance=${variance} ({variance_status})"
            )

        except Exception as e:
            logger.error(f"Failed to sync earnings payment status for paystub {paystub_id}: {e}")
