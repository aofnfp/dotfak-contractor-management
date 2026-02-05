#!/usr/bin/env python3
"""
Paystub processing service - handles upload, parsing, duplicate detection, and auto-matching.
"""

import hashlib
from typing import Dict, Any, Optional, List
from pathlib import Path
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)


class PaystubService:
    """Service for processing paystub uploads."""

    @staticmethod
    def calculate_file_hash(file_content: bytes) -> str:
        """
        Calculate SHA-256 hash of file content for duplicate detection.

        Args:
            file_content: Raw file bytes

        Returns:
            SHA-256 hash string
        """
        return hashlib.sha256(file_content).hexdigest()

    @staticmethod
    def check_duplicate(file_hash: str) -> Optional[Dict]:
        """
        Check if paystub with this hash already exists.

        Args:
            file_hash: SHA-256 hash of file

        Returns:
            Existing paystub record if found, None otherwise
        """
        try:
            result = supabase_admin_client.table("paystubs").select("*").eq(
                "file_hash", file_hash
            ).execute()

            if result.data and len(result.data) > 0:
                logger.info(f"Duplicate paystub found: {result.data[0]['id']}")
                return result.data[0]

            return None

        except Exception as e:
            logger.error(f"Error checking for duplicate: {str(e)}")
            return None

    @staticmethod
    def find_contractor_assignment(
        employee_id: str,
        client_company_id: str,
        pay_period_begin: str
    ) -> Optional[Dict]:
        """
        Find contractor assignment by employee ID and client company.

        Args:
            employee_id: Employee ID from paystub
            client_company_id: Client company UUID
            pay_period_begin: Pay period start date (for checking assignment dates)

        Returns:
            Contractor assignment if found, None otherwise
        """
        try:
            # Query for active assignment matching employee ID and client
            result = supabase_admin_client.table("contractor_assignments").select("*").eq(
                "client_company_id", client_company_id
            ).eq("client_employee_id", employee_id).eq("is_active", True).execute()

            if not result.data or len(result.data) == 0:
                logger.warning(f"No assignment found for employee {employee_id} at client {client_company_id}")
                return None

            # If multiple assignments (shouldn't happen), use the most recent
            if len(result.data) > 1:
                logger.warning(f"Multiple assignments found for employee {employee_id}, using most recent")
                assignments = sorted(result.data, key=lambda x: x['created_at'], reverse=True)
                assignment = assignments[0]
            else:
                assignment = result.data[0]

            # Check if assignment covers this pay period
            start_date = assignment['start_date']
            end_date = assignment.get('end_date')

            if pay_period_begin < start_date:
                logger.warning(f"Assignment started {start_date}, but pay period is {pay_period_begin}")
                return None

            if end_date and pay_period_begin > end_date:
                logger.warning(f"Assignment ended {end_date}, but pay period is {pay_period_begin}")
                return None

            logger.info(f"Matched assignment: {assignment['id']} (contractor: {assignment['contractor_id']})")
            return assignment

        except Exception as e:
            logger.error(f"Error finding contractor assignment: {str(e)}")
            return None

    @staticmethod
    def save_paystub(
        paystub_data: Dict[str, Any],
        contractor_assignment_id: Optional[str],
        client_company_id: str,
        file_hash: str,
        uploaded_by: str,
        file_name: str = None,
        file_size: int = None,
        file_path: str = None
    ) -> Dict[str, Any]:
        """
        Save paystub to database.

        Args:
            paystub_data: Parsed paystub data
            contractor_assignment_id: UUID of contractor assignment (if matched)
            client_company_id: UUID of client company
            file_hash: SHA-256 hash of file
            uploaded_by: UUID of user who uploaded
            file_name: Original filename of uploaded PDF
            file_size: Size of file in bytes
            file_path: Path where file is stored

        Returns:
            Saved paystub record
        """
        try:
            # Extract key fields from paystub
            header = paystub_data.get('header', {})
            employee = header.get('employee', {})
            pay_period = header.get('pay_period', {})
            summary = paystub_data.get('summary', {}).get('current', {})

            # Build paystub record
            paystub_record = {
                'employee_id': employee.get('id'),
                'employee_name': employee.get('name'),
                'organization': paystub_data.get('metadata', {}).get('organization'),
                'pay_period_begin': pay_period.get('begin'),
                'pay_period_end': pay_period.get('end'),
                'check_date': header.get('check_date'),
                'net_pay': summary.get('net_pay'),
                'gross_pay': summary.get('gross_pay'),
                'contractor_assignment_id': contractor_assignment_id,
                'client_company_id': client_company_id,
                'file_hash': file_hash,
                'uploaded_by': uploaded_by,
                'file_name': file_name,
                'file_size': file_size,
                'file_path': file_path,
                'paystub_data': paystub_data  # Store complete JSON
            }

            # Insert paystub
            result = supabase_admin_client.table("paystubs").insert(paystub_record).execute()

            if not result.data:
                raise Exception("Failed to insert paystub")

            logger.info(f"Paystub saved: {result.data[0]['id']}")
            return result.data[0]

        except Exception as e:
            logger.error(f"Error saving paystub: {str(e)}")
            raise

    @staticmethod
    def save_earnings(
        paystub_id: int,
        contractor_assignment_id: str,
        earnings: Dict[str, Any],
        pay_period_begin: str,
        pay_period_end: str
    ) -> Dict[str, Any]:
        """
        Save contractor earnings to database.

        Args:
            paystub_id: Paystub ID
            contractor_assignment_id: Contractor assignment UUID
            earnings: Calculated earnings
            pay_period_begin: Pay period start date
            pay_period_end: Pay period end date

        Returns:
            Saved earnings record
        """
        try:
            earnings_record = {
                'contractor_assignment_id': contractor_assignment_id,
                'paystub_id': paystub_id,
                'pay_period_begin': pay_period_begin,
                'pay_period_end': pay_period_end,
                'client_gross_pay': earnings['client_gross_pay'],
                'client_total_hours': earnings['client_total_hours'],
                'contractor_regular_earnings': earnings['contractor_regular_earnings'],
                'contractor_bonus_share': earnings['contractor_bonus_share'],
                'contractor_total_earnings': earnings['contractor_total_earnings'],
                'company_margin': earnings['company_margin'],
                'payment_status': earnings['payment_status'],
                'amount_paid': earnings['amount_paid'],
                'amount_pending': earnings['amount_pending']
            }

            result = supabase_admin_client.table("contractor_earnings").insert(earnings_record).execute()

            if not result.data:
                raise Exception("Failed to insert earnings")

            logger.info(f"Earnings saved: {result.data[0]['id']} - ${earnings['contractor_total_earnings']}")
            return result.data[0]

        except Exception as e:
            logger.error(f"Error saving earnings: {str(e)}")
            raise

    @staticmethod
    def get_client_company_by_code(organization_code: str) -> Optional[Dict]:
        """
        Get client company by organization code.

        Args:
            organization_code: Organization code from paystub (e.g., 'ap_account_services')

        Returns:
            Client company record if found
        """
        try:
            result = supabase_admin_client.table("client_companies").select("*").eq(
                "code", organization_code
            ).execute()

            if result.data and len(result.data) > 0:
                return result.data[0]

            logger.warning(f"Client company not found: {organization_code}")
            return None

        except Exception as e:
            logger.error(f"Error fetching client company: {str(e)}")
            return None
