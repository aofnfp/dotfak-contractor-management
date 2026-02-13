#!/usr/bin/env python3
"""
Parser for Everise, Inc. paystub format.

Everise paystubs have a two-column layout where earnings and employee taxes
appear side-by-side. pdfplumber concatenates them onto the same text line,
so we must strip trailing tax data before parsing earnings.

Earning line patterns:
  1. Standard (with dates): "Regular 09/12/2025 - 09/20/2025 0.33332 15 5.00 5.00"
  2. YTD-only (no current period): "New Hire Orientation 0 293.00"
  Both may have trailing tax text: "... Social Security 18.48 18.48"
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class EveriseParser:
    """Parser for Everise, Inc. paystub format."""

    def __init__(self):
        self.version = "1.0-EVERISE-PARSER"
        self.organization = "everise"

    def parse(self, text: str, source_file: str = None) -> List[Dict[str, Any]]:
        """
        Parse paystub text and extract all data.

        Args:
            text: Extracted text from PDF
            source_file: Original PDF filename

        Returns:
            List of paystub dictionaries (one per pay period found)
        """
        pages = self._split_pages(text)

        paystubs = []
        for page in pages:
            try:
                paystub = self._parse_single_paystub(page, source_file)
                if paystub:
                    paystubs.append(paystub)
            except Exception as e:
                logger.warning(f"Failed to parse Everise page: {e}")
                continue

        return paystubs

    def _split_pages(self, text: str) -> List[str]:
        """Split text into individual pages."""
        pages = re.split(r'={80}\nPAGE \d+\n={80}', text)
        return [p.strip() for p in pages if p.strip()]

    def _parse_single_paystub(self, text: str, source_file: str = None) -> Optional[Dict[str, Any]]:
        """Parse a single paystub from page text."""
        header = self._parse_header(text)

        # Skip pages that don't look like a paystub
        if not header.get("pay_period", {}).get("begin"):
            return None

        paystub = {
            "metadata": {
                "organization": self.organization,
                "parser_version": self.version,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
                "source_file": source_file
            },
            "header": header,
            "summary": self._parse_summary(text),
            "earnings": self._parse_earnings(text),
            "taxes": self._parse_taxes(text),
            "pre_tax_deductions": [],
            "deductions": [],
            "employer_benefits": [],
            "taxable_wages": self._parse_taxable_wages(text),
            "tax_info": self._parse_tax_info(text),
            "payment_info": self._parse_payment_info(text)
        }

        self._validate(paystub)

        return paystub

    def _parse_header(self, text: str) -> Dict[str, Any]:
        """Extract header information.

        Header lines:
          Everise, Inc. 600 N. Pine Island Road 320 Plantation, FL 33324
          Name Company Employee ID Pay Period Begin Pay Period End Check Date Check Number
          Abraham Oladotun Everise, Inc. 801875 09/07/2025 09/20/2025 09/26/2025
        """
        header = {
            "company": {
                "name": "Everise, Inc.",
                "address": ""
            },
            "employee": {"name": "", "id": None},
            "pay_period": {},
            "check_date": None,
            "check_number": None
        }

        # Company address from first line
        addr_match = re.search(
            r'Everise,\s*Inc\.\s+(.+)',
            text.split('\n')[0] if text else ''
        )
        if addr_match:
            header["company"]["address"] = addr_match.group(1).strip()

        # Employee info line: "Abraham Oladotun Everise, Inc. 801875 09/07/2025 09/20/2025 09/26/2025"
        # The line has: Name, Company, Employee ID, dates, optional check number
        emp_match = re.search(
            r'^(.+?)\s+Everise,\s*Inc\.\s+(\d+)\s+'
            r'(\d{2}/\d{2}/\d{4})\s+'   # pay period begin
            r'(\d{2}/\d{2}/\d{4})\s+'   # pay period end
            r'(\d{2}/\d{2}/\d{4})'      # check date
            r'(?:\s+(\S+))?',            # optional check number
            text,
            re.MULTILINE
        )
        if emp_match:
            header["employee"]["name"] = emp_match.group(1).strip()
            header["employee"]["id"] = emp_match.group(2).strip()
            header["pay_period"]["begin"] = self._parse_date(emp_match.group(3))
            header["pay_period"]["end"] = self._parse_date(emp_match.group(4))
            header["check_date"] = self._parse_date(emp_match.group(5))
            if emp_match.group(6):
                header["check_number"] = emp_match.group(6).strip()

        return header

    def _parse_summary(self, text: str) -> Dict[str, Any]:
        """Extract summary totals.

        Lines:
          Current 298.00 0.00 22.80 0.00 275.20
          YTD 298.00 0.00 22.80 0.00 275.20
        Order: Gross Pay, Pre Tax Deductions, Employee Taxes, Post Tax Deductions, Net Pay
        """
        summary = {
            "current": {
                "gross_pay": 0.0,
                "pre_tax_deductions": 0.0,
                "employee_taxes": 0.0,
                "deductions": 0.0,
                "net_pay": 0.0
            },
            "ytd": {
                "gross_pay": 0.0,
                "pre_tax_deductions": 0.0,
                "employee_taxes": 0.0,
                "deductions": 0.0,
                "net_pay": 0.0
            }
        }

        summary_pattern = re.compile(
            r'^(Current|YTD)\s+'
            r'([\d,]+\.\d{2})\s+'   # gross pay
            r'([\d,]+\.\d{2})\s+'   # pre-tax deductions
            r'([\d,]+\.\d{2})\s+'   # employee taxes
            r'([\d,]+\.\d{2})\s+'   # post-tax deductions
            r'([\d,]+\.\d{2})',      # net pay
            re.MULTILINE
        )

        for match in summary_pattern.finditer(text):
            key = "current" if match.group(1) == "Current" else "ytd"
            summary[key]["gross_pay"] = self._parse_decimal(match.group(2))
            summary[key]["pre_tax_deductions"] = self._parse_decimal(match.group(3))
            summary[key]["employee_taxes"] = self._parse_decimal(match.group(4))
            summary[key]["deductions"] = self._parse_decimal(match.group(5))
            summary[key]["net_pay"] = self._parse_decimal(match.group(6))

        return summary

    # Regex to strip trailing tax data from an earnings line.
    # Tax descriptions like "Social Security 18.48 18.48" or "Medicare 4.32 4.32"
    # appear appended at the end of earnings lines.
    _RE_TRAILING_TAX = re.compile(
        r'\s+(Social Security|Medicare|Federal W/H|State W/H|'
        r'Fed MED/EE|Fed OASDI/EE|Local W/H|SUI/SDI)\s+'
        r'[\d,]+\.\d{2}\s+[\d,]+\.\d{2}\s*$'
    )

    # Earnings line with dates: "Description MM/DD/YYYY - MM/DD/YYYY hours rate amount ytd"
    _RE_EARNING_WITH_DATES = re.compile(
        r'^(.+?)\s+'
        r'(\d{2}/\d{2}/\d{4}\s*-\s*\d{2}/\d{2}/\d{4})\s+'
        r'([\d.]+)\s+'              # hours
        r'([\d.]+)\s+'              # rate
        r'([\d,]+\.\d{2})\s+'       # amount
        r'([\d,]+\.\d{2})'          # ytd
    )

    # YTD-only line: "Description 0 ytd_amount" (hours = 0, no current period)
    _RE_EARNING_YTD_ONLY = re.compile(
        r'^(.+?)\s+0\s+([\d,]+\.\d{2})\s*$'
    )

    def _parse_earnings(self, text: str) -> List[Dict[str, Any]]:
        """Extract earnings breakdown.

        Lines appear between the header row and the "Earnings" totals line.
        Each line may have trailing tax data that must be stripped first.
        """
        earnings = []

        # Find the earnings section: between "Description Dates Hours Rate Amount YTD"
        # and the totals line "Earnings <amount> <ytd>"
        section_match = re.search(
            r'Description\s+Dates\s+Hours\s+Rate\s+Amount\s+YTD\s+Description\s+Amount\s+YTD\n'
            r'(.*?)'
            r'\nEarnings\s+[\d,]+\.\d{2}',
            text,
            re.DOTALL
        )

        if not section_match:
            return earnings

        lines = section_match.group(1).strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Strip trailing tax data (e.g., "Social Security 18.48 18.48")
            clean_line = self._RE_TRAILING_TAX.sub('', line).strip()

            # Pattern 1: Earning with dates
            match = self._RE_EARNING_WITH_DATES.match(clean_line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": match.group(2).strip(),
                    "hours": self._parse_float(match.group(3)),
                    "rate": self._parse_float(match.group(4)),
                    "amount": self._parse_decimal(match.group(5)),
                    "ytd": self._parse_decimal(match.group(6))
                })
                continue

            # Pattern 2: YTD-only (hours = 0, no current amount)
            match = self._RE_EARNING_YTD_ONLY.match(clean_line)
            if match:
                desc = match.group(1).strip()
                # Skip if description looks like a section header
                if desc.lower() in ('earnings', 'employee taxes', 'description'):
                    continue
                earnings.append({
                    "description": desc,
                    "dates": None,
                    "hours": 0,
                    "rate": 0,
                    "amount": 0,
                    "ytd": self._parse_decimal(match.group(2))
                })
                continue

        return earnings

    # Known tax description patterns
    _KNOWN_TAX_DESCRIPTIONS = {
        "Social Security", "Medicare", "Federal W/H", "State W/H",
        "Fed MED/EE", "Fed OASDI/EE", "Local W/H",
    }

    _RE_TAX_AT_END = re.compile(
        r'(Social Security|Medicare|Federal W/H|State W/H|'
        r'Fed MED/EE|Fed OASDI/EE|Local W/H)\s+'
        r'([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$'
    )

    def _parse_taxes(self, text: str) -> List[Dict[str, Any]]:
        """Extract employee taxes from the right column of earnings lines."""
        taxes = []
        seen = set()

        # Find the earnings/taxes section
        section_match = re.search(
            r'Description\s+Dates\s+Hours\s+Rate\s+Amount\s+YTD\s+Description\s+Amount\s+YTD\n'
            r'(.*?)'
            r'\nEarnings\s+[\d,]+\.\d{2}',
            text,
            re.DOTALL
        )

        if section_match:
            lines = section_match.group(1).strip().split('\n')
            for line in lines:
                match = self._RE_TAX_AT_END.search(line)
                if match:
                    desc = match.group(1).strip()
                    if desc not in seen:
                        taxes.append({
                            "description": desc,
                            "amount": self._parse_decimal(match.group(2)),
                            "ytd": self._parse_decimal(match.group(3))
                        })
                        seen.add(desc)

        return taxes

    def _parse_taxable_wages(self, text: str) -> List[Dict[str, Any]]:
        """Extract taxable wages section.

        Between "Taxable Wages" and "Federal State" headers.
        Lines like: "OASDI - Taxable Wages 298.00 298.00"
        """
        wages = []

        section = re.search(
            r'Taxable Wages\n'
            r'Description\s+Amount\s+YTD\n'
            r'(.*?)'
            r'\nFederal\s+State',
            text,
            re.DOTALL
        )

        if not section:
            return wages

        for line in section.group(1).strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            match = re.match(r'(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$', line)
            if match:
                wages.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return wages

    def _parse_tax_info(self, text: str) -> Dict[str, Any]:
        """Extract tax filing info (marital status, allowances, etc.).

        Between "Federal State" and "Payment Information".
        """
        info = {
            "marital_status": "",
            "federal_allowances": 0,
            "state_allowances": 0,
            "additional_withholding": 0.0,
            "total_dependent_amount": 0.0,
        }

        section = re.search(
            r'Federal\s+State\n(.*?)Payment Information',
            text,
            re.DOTALL
        )
        if not section:
            return info

        block = section.group(1)

        marital_match = re.search(r'Marital Status\s+(.+)', block)
        if marital_match:
            info["marital_status"] = marital_match.group(1).strip()

        allowances_match = re.search(r'Allowances\s+(\d+)\s+(\d+)', block)
        if allowances_match:
            info["federal_allowances"] = int(allowances_match.group(1))
            info["state_allowances"] = int(allowances_match.group(2))

        dep_match = re.search(r'Total Dependent Amount\s+(\d+)', block)
        if dep_match:
            info["total_dependent_amount"] = float(dep_match.group(1))

        wh_match = re.search(r'Additional Withholding\s+(\d+)', block)
        if wh_match:
            info["additional_withholding"] = float(wh_match.group(1))

        return info

    def _parse_payment_info(self, text: str) -> List[Dict[str, Any]]:
        """Extract payment/direct deposit information.

        After "Payment Information" header.
        Lines like: "Chase Bank Chase Bank ******9058 ******9058 275.20 USD"
        Bank name and account name appear duplicated.
        """
        payments = []

        section = re.search(
            r'Payment Information\n'
            r'Bank\s+Account Name\s+Account Number\s+USD Amount\s+Amount\n'
            r'(.*?)$',
            text,
            re.DOTALL
        )

        if not section:
            return payments

        for line in section.group(1).strip().split('\n'):
            line = line.strip()
            if not line:
                continue

            # Pattern: "BankName BankName ******NNNN ******NNNN amount USD"
            # The bank name and account number are duplicated.
            # Match from the right: amount USD, then masked account, then the rest.
            match = re.match(
                r'(.+?)\s+(\*{6}\d{4})\s+\*{6}\d{4}\s+([\d,]+\.\d{2})\s+USD',
                line
            )
            if match:
                raw_name = match.group(1).strip()
                account_number = match.group(2)
                amount = self._parse_decimal(match.group(3))

                # The bank name is duplicated: "Chase Bank Chase Bank" or
                # "Evolve Bank & Trust Evolve Bank & Trust"
                # Try to find the repeated half
                bank_name = self._deduplicate_name(raw_name)

                payments.append({
                    "bank_name": bank_name,
                    "account_name": bank_name,
                    "account_number": f"****{account_number[-4:]}",
                    "amount": amount,
                    "currency": "USD"
                })

        return payments

    def _deduplicate_name(self, raw: str) -> str:
        """Deduplicate a repeated name like 'Chase Bank Chase Bank'.

        Tries splitting the string in half to see if both halves match.
        Falls back to the full string.
        """
        words = raw.split()
        n = len(words)
        if n >= 2 and n % 2 == 0:
            half = n // 2
            first_half = ' '.join(words[:half])
            second_half = ' '.join(words[half:])
            if first_half == second_half:
                return first_half
        return raw

    def _validate(self, paystub: Dict[str, Any]) -> None:
        """Post-parse validation warnings."""
        header = paystub.get("header", {})
        summary = paystub.get("summary", {})
        earnings = paystub.get("earnings", [])
        payments = paystub.get("payment_info", [])

        period = header.get("pay_period", {}).get("begin", "?")

        emp_id = header.get("employee", {}).get("id")
        if not emp_id:
            logger.error(f"[{period}] Missing employee ID - auto-matching will fail")

        begin = header.get("pay_period", {}).get("begin")
        if not begin:
            logger.error(f"[{period}] Missing pay period begin date")

        # Earnings sum vs gross pay
        earnings_total = sum(e.get("amount", 0) for e in earnings)
        gross_pay = summary.get("current", {}).get("gross_pay", 0)
        if gross_pay and abs(earnings_total - gross_pay) > 1.0:
            logger.warning(
                f"[{period}] Earnings sum (${earnings_total:.2f}) != "
                f"Gross Pay (${gross_pay:.2f}) — gap: ${abs(earnings_total - gross_pay):.2f}"
            )

        # Payment splits vs net pay
        payment_total = sum(p.get("amount", 0) for p in payments)
        net_pay = summary.get("current", {}).get("net_pay", 0)
        if net_pay and abs(payment_total - net_pay) > 0.02:
            logger.warning(
                f"[{period}] Payment splits (${payment_total:.2f}) != "
                f"Net Pay (${net_pay:.2f})"
            )

    def _parse_date(self, date_str: str) -> str:
        """Convert MM/DD/YYYY to YYYY-MM-DD."""
        try:
            dt = datetime.strptime(date_str.strip(), "%m/%d/%Y")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            return date_str

    def _parse_decimal(self, value_str: str) -> float:
        """Parse string to float, handling commas."""
        if not value_str:
            return 0.0
        try:
            return float(value_str.replace(',', '').strip())
        except Exception:
            return 0.0

    def _parse_float(self, value_str: str) -> float:
        """Parse a float value (hours, rates — no commas)."""
        if not value_str:
            return 0.0
        try:
            return float(value_str.strip())
        except Exception:
            return 0.0


def parse(text: str, source_file: str = None, **kwargs) -> List[Dict[str, Any]]:
    """
    Parse Everise paystub text.

    Args:
        text: Extracted PDF text
        source_file: Original filename

    Returns:
        List of parsed paystub dictionaries
    """
    parser = EveriseParser()
    return parser.parse(text, source_file)
