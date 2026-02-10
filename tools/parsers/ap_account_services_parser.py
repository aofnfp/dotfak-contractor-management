#!/usr/bin/env python3
"""
Parser for AP Account Services LLC paystub format.

This parser uses regex patterns to extract all data fields from
AP Account Services paystub PDFs.
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from decimal import Decimal


class APAccountServicesParser:
    """Parser for AP Account Services paystub format."""

    def __init__(self):
        """Initialize parser with regex patterns."""
        self.version = "2.0-TOKEN-BASED-PARSER"
        self.organization = "ap_account_services"

    def parse(self, text: str, source_file: str = None) -> List[Dict[str, Any]]:
        """
        Parse paystub text and extract all data.

        Args:
            text: Extracted text from PDF
            source_file: Original PDF filename

        Returns:
            List of paystub dictionaries (one per pay period found)
        """
        # Split into pages
        pages = self._split_pages(text)

        paystubs = []
        for page in pages:
            try:
                paystub = self._parse_single_paystub(page, source_file)
                if paystub:
                    paystubs.append(paystub)
            except Exception as e:
                print(f"Warning: Failed to parse page: {e}")
                continue

        return paystubs

    def _split_pages(self, text: str) -> List[str]:
        """Split text into individual pages."""
        # Look for page markers or company header as page delimiters
        pages = re.split(r'={80}\nPAGE \d+\n={80}', text)
        return [p.strip() for p in pages if p.strip()]

    def _parse_single_paystub(self, text: str, source_file: str = None) -> Dict[str, Any]:
        """Parse a single paystub from page text."""
        paystub = {
            "metadata": {
                "organization": self.organization,
                "parser_version": self.version,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
                "source_file": source_file
            },
            "header": self._parse_header(text),
            "summary": self._parse_summary(text),
            "earnings": self._parse_earnings(text),
            "taxes": self._parse_taxes(text),
            "pre_tax_deductions": self._parse_pre_tax_deductions(text),
            "deductions": self._parse_deductions(text),
            "employer_benefits": self._parse_employer_benefits(text),
            "taxable_wages": self._parse_taxable_wages(text),
            "tax_info": self._parse_tax_info(text),
            "payment_info": self._parse_payment_info(text)
        }

        return paystub

    def _parse_header(self, text: str) -> Dict[str, Any]:
        """Extract header information."""
        header = {
            "company": {},
            "employee": {},
            "pay_period": {},
            "check_date": None,
            "check_number": None
        }

        # Company info
        company_match = re.search(r'(AP Account Services LLC)\s+(.+?)\n', text)
        if company_match:
            header["company"]["name"] = company_match.group(1)
            header["company"]["address"] = company_match.group(2).strip()

        # Employee info
        name_match = re.search(r'Name\s+Company.*?\n([^\n]+?)\s+AP Account Services', text)
        if name_match:
            header["employee"]["name"] = name_match.group(1).strip()

        # Employee ID appears after company name on the same line as dates
        emp_id_match = re.search(r'AP Account Services LLC\s+(\d+)\s+\d{2}/\d{2}/\d{4}', text)
        if emp_id_match:
            header["employee"]["id"] = emp_id_match.group(1)

        # Pay period dates
        pay_period_match = re.search(
            r'Pay Period Begin\s+Pay Period End.*?\n[^\n]*?\s+(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})',
            text
        )
        if pay_period_match:
            header["pay_period"]["begin"] = self._parse_date(pay_period_match.group(1))
            header["pay_period"]["end"] = self._parse_date(pay_period_match.group(2))

        # Check date
        check_date_match = re.search(r'Check Date\s+Check Number.*?\n[^\n]*?\s+(\d{2}/\d{2}/\d{4})', text)
        if check_date_match:
            header["check_date"] = self._parse_date(check_date_match.group(1))

        # Check number (optional)
        check_num_match = re.search(r'Check Date\s+Check Number.*?\n[^\n]*?\s+\d{2}/\d{2}/\d{4}\s+(\S+)', text)
        if check_num_match:
            num = check_num_match.group(1).strip()
            header["check_number"] = num if num else None

        return header

    def _parse_summary(self, text: str) -> Dict[str, Any]:
        """Extract summary section (Gross Pay, Taxes, Deductions, Net Pay)."""
        summary = {
            "current": {},
            "ytd": {}
        }

        # Current values
        current_match = re.search(
            r'Current\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)',
            text
        )
        if current_match:
            summary["current"] = {
                "gross_pay": self._parse_decimal(current_match.group(1)),
                "pre_tax_deductions": self._parse_decimal(current_match.group(2)),
                "employee_taxes": self._parse_decimal(current_match.group(3)),
                "deductions": self._parse_decimal(current_match.group(4)),
                "net_pay": self._parse_decimal(current_match.group(5))
            }

        # YTD values
        ytd_match = re.search(
            r'YTD\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)',
            text
        )
        if ytd_match:
            summary["ytd"] = {
                "gross_pay": self._parse_decimal(ytd_match.group(1)),
                "pre_tax_deductions": self._parse_decimal(ytd_match.group(2)),
                "employee_taxes": self._parse_decimal(ytd_match.group(3)),
                "deductions": self._parse_decimal(ytd_match.group(4)),
                "net_pay": self._parse_decimal(ytd_match.group(5))
            }

        return summary

    # Regex for standard earnings line: Description Dates Hours Rate Amount YTD
    _RE_EARNING_STANDARD = re.compile(
        r'([^\d]+?)\s+(\d{2}/\d{2}/\d{4}-\d{2}/\d{2}/\d{4})\s+'
        r'([\d\.]+)\s+([\d\.]+)\s+([\d,\.]+)\s+([\d,\.]+)'
    )

    # Regex for corrupted date merge: pdfplumber sometimes merges the description
    # text with the date column (e.g. "Top Perform Bonus Quarter1ly0/05/2025-10/18/2025")
    # Captures the alphabetic part as description, then amounts after the corrupted date.
    _RE_EARNING_CORRUPTED_DATE = re.compile(
        r'^([A-Za-z].*?[A-Za-z])\d+[A-Za-z]*\d*/\d{2}/\d{4}-\d{2}/\d{2}/\d{4}\s+'
        r'([\d\.]+)\s+([\d\.]+)\s+([\d,\.]+)\s+([\d,\.]+)$'
    )

    # Regex for YTD-only lines: earning types with no current-period activity
    # (e.g. "Holiday 512.00" or "Vacation 256.00" — just description + YTD amount)
    _RE_EARNING_YTD_ONLY = re.compile(
        r'^([A-Za-z][A-Za-z\s\(\)]+?)\s+([\d,\.]+)$'
    )

    def _parse_earnings(self, text: str) -> List[Dict[str, Any]]:
        """Extract earnings breakdown."""
        earnings = []

        # Find earnings section
        earnings_section = re.search(
            r'Earnings.*?Description\s+Dates\s+Hours\s+Rate\s+Amount\s+YTD(.*?)(?:Earnings\s+[\d,\.]+\s+[\d,\.]+|Employee Taxes)',
            text,
            re.DOTALL
        )

        if not earnings_section:
            return earnings

        lines_text = earnings_section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Earnings') or line.startswith('Description'):
                continue

            # Try Pattern 1: Standard earnings line (Description Dates Hours Rate Amount YTD)
            match = self._RE_EARNING_STANDARD.match(line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": match.group(2).strip(),
                    "hours": self._parse_decimal(match.group(3)),
                    "rate": self._parse_decimal(match.group(4)),
                    "amount": self._parse_decimal(match.group(5)),
                    "ytd": self._parse_decimal(match.group(6))
                })
                continue

            # Try Pattern 2: Corrupted date merge (pdfplumber column bleed)
            match = self._RE_EARNING_CORRUPTED_DATE.match(line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": None,
                    "hours": self._parse_decimal(match.group(2)),
                    "rate": self._parse_decimal(match.group(3)),
                    "amount": self._parse_decimal(match.group(4)),
                    "ytd": self._parse_decimal(match.group(5))
                })
                continue

            # Try Pattern 3: YTD-only line (no current-period activity)
            match = self._RE_EARNING_YTD_ONLY.match(line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": None,
                    "hours": 0,
                    "rate": 0,
                    "amount": 0,
                    "ytd": self._parse_decimal(match.group(2))
                })
                continue

        return earnings

    def _parse_taxes(self, text: str) -> List[Dict[str, Any]]:
        """Extract employee taxes."""
        taxes = []

        # Find tax section
        tax_section = re.search(
            r'Employee Taxes\s+Description\s+Amount\s+YTD(.*?)(?:Employee Taxes\s+[\d,\.]+\s+[\d,\.]+|Subject or Taxable Wages)',
            text,
            re.DOTALL
        )

        if not tax_section:
            return taxes

        lines_text = tax_section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Employee Taxes'):
                continue

            # Parse tax line: Description Amount YTD
            match = re.match(r'([^\d]+?)\s+([\d,\.]+)\s+([\d,\.]+)', line)

            if match:
                taxes.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return taxes

    def _parse_pre_tax_deductions(self, text: str) -> List[Dict[str, Any]]:
        """Extract pre-tax deductions."""
        deductions = []

        # Find pre-tax deductions section
        section = re.search(
            r'Pre Tax Deductions\s+Description\s+Amount\s+YTD(.*?)(?:Pre Tax Deductions\s+[\d,\.]+\s+[\d,\.]+|Employer Paid Benefits)',
            text,
            re.DOTALL
        )

        if not section:
            return deductions

        lines_text = section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Pre Tax'):
                continue

            match = re.match(r'([^\d]+?)\s+([\d,\.]+)\s+([\d,\.]+)', line)

            if match:
                deductions.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return deductions

    def _parse_deductions(self, text: str) -> List[Dict[str, Any]]:
        """Extract post-tax deductions."""
        deductions = []

        # Find deductions section (not "Pre Tax Deductions")
        # Look for pattern like "United Way", "Fringe Offset" etc.
        section = re.search(
            r'(?:^|\n)Deductions\s+Description\s+Amount\s+YTD(.*?)(?:Deductions\s+[\d,\.]+\s+[\d,\.]+|$)',
            text,
            re.DOTALL | re.MULTILINE
        )

        if not section:
            return deductions

        lines_text = section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Deduction'):
                continue

            match = re.match(r'([^\d]+?)\s+([\d,\.]+)\s+([\d,\.]+)', line)

            if match:
                deductions.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return deductions

    def _parse_employer_benefits(self, text: str) -> List[Dict[str, Any]]:
        """Extract employer-paid benefits."""
        benefits = []

        section = re.search(
            r'Employer Paid Benefits\s+Description\s+Amount\s+YTD(.*?)(?:Employer Paid Benefits\s+[\d,\.]+\s+[\d,\.]+|Subject or Taxable Wages)',
            text,
            re.DOTALL
        )

        if not section:
            return benefits

        lines_text = section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Employer'):
                continue

            match = re.match(r'([^\d]+?)\s+([\d,\.]+)\s+([\d,\.]+)', line)

            if match:
                benefits.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return benefits

    def _parse_taxable_wages(self, text: str) -> List[Dict[str, Any]]:
        """Extract taxable wages."""
        wages = []

        section = re.search(
            r'Subject or Taxable Wages\s+Description\s+Amount\s+YTD(.*?)(?:\n\s*\n|Federal\s+State|Marital Status)',
            text,
            re.DOTALL
        )

        if not section:
            return wages

        lines_text = section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Description'):
                continue

            match = re.match(r'([^\d]+?)\s+([\d,\.]+)\s+([\d,\.]+)', line)

            if match:
                wages.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return wages

    def _parse_tax_info(self, text: str) -> Dict[str, Any]:
        """Extract tax filing information."""
        tax_info = {}

        # Marital status
        marital_match = re.search(r'Marital Status\s+.*?\n.*?\s+([^\n]+?)(?:\s+State|\n)', text)
        if marital_match:
            tax_info["marital_status"] = marital_match.group(1).strip()

        # Allowances
        allowances_match = re.search(r'Allowances\s+(\d+)\s+(\d+)', text)
        if allowances_match:
            tax_info["federal_allowances"] = int(allowances_match.group(1))
            tax_info["state_allowances"] = int(allowances_match.group(2))

        # Additional withholding
        withholding_match = re.search(r'Additional Withholding\s+(\d+)', text)
        if withholding_match:
            tax_info["additional_withholding"] = self._parse_decimal(withholding_match.group(1))

        return tax_info

    def _parse_payment_info(self, text: str) -> List[Dict[str, Any]]:
        """Extract payment/direct deposit information."""
        payments = []

        # Find payment information section - capture until next major section or company name
        section = re.search(
            r'Payment Information.*?Bank\s+Account Name\s+Account Number.*?Payment Amount\s*\n(.*?)(?=\n[A-Z][A-Za-z\s]+LLC|\Z)',
            text,
            re.DOTALL | re.MULTILINE
        )

        if not section:
            return payments

        lines_text = section.group(1).strip()
        lines = lines_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('Bank') or '=' in line:
                continue

            # Parse payment line - handle both formats:
            # Format 1: "Lead Bank Lead Bank ******5257 ******5257 150.11 USD" (account# twice)
            # Format 2: "Chase Bank Chase B. ******9058 506.53 USD" (account# once)

            # Split by spaces and look for asterisk pattern
            parts = line.split()
            account_indices = [i for i, part in enumerate(parts) if part.startswith('*')]

            if not account_indices:
                continue

            # Find the account number (first occurrence of ******xxxx)
            account_idx = account_indices[0]
            account_number = parts[account_idx]

            # Everything before account number is bank_name + account_name
            before_account = parts[:account_idx]
            if len(before_account) < 2:
                continue

            # Try to split bank name and account name
            # Usually bank name is first word(s), account name is rest
            bank_name = ' '.join(before_account[:len(before_account)//2]) if len(before_account) > 2 else before_account[0]
            account_name = ' '.join(before_account[len(before_account)//2:]) if len(before_account) > 2 else before_account[-1]

            # Everything after account number(s) should be amount and optionally currency
            after_account = parts[account_idx+1:]
            # Skip duplicate account number if present
            if after_account and after_account[0].startswith('*'):
                after_account = after_account[1:]

            if not after_account:
                continue

            amount_str = after_account[0]
            currency = after_account[1] if len(after_account) > 1 else "USD"

            payment = {
                "bank_name": bank_name,
                "account_name": account_name,
                "account_number": account_number,
                "amount": self._parse_decimal(amount_str),
                "currency": currency
            }

            payments.append(payment)

        return payments

    def _parse_date(self, date_str: str) -> str:
        """Convert MM/DD/YYYY to YYYY-MM-DD."""
        try:
            dt = datetime.strptime(date_str.strip(), "%m/%d/%Y")
            return dt.strftime("%Y-%m-%d")
        except:
            return date_str

    def _parse_decimal(self, value_str: str) -> float:
        """Parse string to decimal, handling commas."""
        if not value_str:
            return 0.0
        try:
            clean = value_str.replace(',', '').strip()
            return float(clean)
        except:
            return 0.0


def parse(text: str, source_file: str = None) -> List[Dict[str, Any]]:
    """
    Parse AP Account Services paystub text.

    Args:
        text: Extracted PDF text
        source_file: Original filename

    Returns:
        List of parsed paystub dictionaries
    """
    parser = APAccountServicesParser()
    return parser.parse(text, source_file)
