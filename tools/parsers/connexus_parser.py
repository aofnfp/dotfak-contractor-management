#!/usr/bin/env python3
"""
Parser for CONNEXUS Resource Group Inc paystub format.

This parser uses regex patterns to extract all data fields from
CONNEXUS paystub PDFs. Each PDF page contains one paystub with
a check stub duplicate at the bottom (ignored).

Earning line patterns:
  1. Standard (4 numbers): "Regular 12.00 87.91 1054.92 2892.24"
     → Rate, Hours, Amount, YTD
  2. Bonus/no-rate (2 numbers): "Bonus 150.00 150.00"
     → Amount, YTD (no rate/hours)
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class ConnexusParser:
    """Parser for CONNEXUS Resource Group paystub format."""

    def __init__(self):
        self.version = "1.0-CONNEXUS-PARSER"
        self.organization = "connexus"

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
                logger.warning(f"Failed to parse page: {e}")
                continue

        return paystubs

    def _split_pages(self, text: str) -> List[str]:
        """Split text into individual pages."""
        pages = re.split(r'={80}\nPAGE \d+\n={80}', text)
        return [p.strip() for p in pages if p.strip()]

    def _parse_single_paystub(self, text: str, source_file: str = None) -> Dict[str, Any]:
        """Parse a single paystub from page text."""
        # Truncate at check stub to avoid parsing duplicates.
        # The check stub starts after the Employee Benefits section
        # with a second "Voucher No." line.
        truncated = self._truncate_check_stub(text)

        paystub = {
            "metadata": {
                "organization": self.organization,
                "parser_version": self.version,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
                "source_file": source_file
            },
            "header": self._parse_header(truncated),
            "summary": self._parse_summary(truncated),
            "earnings": self._parse_earnings(truncated),
            "taxes": self._parse_taxes(truncated),
            "pre_tax_deductions": [],
            "deductions": [],
            "employer_benefits": [],
            "taxable_wages": [],
            "tax_info": {},
            "payment_info": self._parse_payment_info(truncated)
        }

        # Validation
        self._validate(paystub)

        return paystub

    def _truncate_check_stub(self, text: str) -> str:
        """Remove the duplicate check stub at the bottom of each page.

        The check stub starts at the second "Voucher No." occurrence
        (the first is on the Net Pay line).
        """
        voucher_positions = [m.start() for m in re.finditer(r'Voucher No\.', text)]
        if len(voucher_positions) >= 2:
            return text[:voucher_positions[1]].strip()
        return text

    def _parse_header(self, text: str) -> Dict[str, Any]:
        """Extract header information."""
        header = {
            "company": {"name": "", "address": ""},
            "employee": {"name": "", "id": None},
            "pay_period": {},
            "check_date": None,
            "check_number": None
        }

        # Employee name: after "Earnings Statement"
        name_match = re.search(r'Earnings Statement\s+(.+)', text)
        if name_match:
            header["employee"]["name"] = name_match.group(1).strip()

        # Employee ID: "Emp #: ASAZ"
        emp_id_match = re.search(r'Emp #:\s*(\S+)', text)
        if emp_id_match:
            header["employee"]["id"] = emp_id_match.group(1).strip()

        # Company name: between "Company:" and "Emp #:"
        company_match = re.search(r'Company:\s*(.+?)\s+Emp #:', text)
        if company_match:
            header["company"]["name"] = company_match.group(1).strip()

        # Company address: on the Period Start and Period End lines
        addr_parts = []
        addr_match = re.search(r'Period Start:\s*\d{2}/\d{2}/\d{4}\s+(.+?)\s+Dept:', text)
        if addr_match:
            addr_parts.append(addr_match.group(1).strip())
        addr_match2 = re.search(r'Period End:\s*\d{2}/\d{2}/\d{4}\s+(.+?)\s+\(\d{3}\)', text)
        if addr_match2:
            addr_parts.append(addr_match2.group(1).strip())
        if addr_parts:
            header["company"]["address"] = ", ".join(addr_parts)

        # Pay date (= check date)
        pay_date_match = re.search(r'Pay Date:\s*(\d{2}/\d{2}/\d{4})', text)
        if pay_date_match:
            header["check_date"] = self._parse_date(pay_date_match.group(1))

        # Pay period begin/end
        period_start = re.search(r'Period Start:\s*(\d{2}/\d{2}/\d{4})', text)
        period_end = re.search(r'Period End:\s*(\d{2}/\d{2}/\d{4})', text)
        if period_start:
            header["pay_period"]["begin"] = self._parse_date(period_start.group(1))
        if period_end:
            header["pay_period"]["end"] = self._parse_date(period_end.group(1))

        # Check number from Voucher No. on the Net Pay line
        voucher_match = re.search(r'Voucher No\.\s*(\S+)', text)
        if voucher_match:
            header["check_number"] = voucher_match.group(1).strip()

        return header

    # Earnings line with rate and hours (4 numbers):
    #   "Regular 12.00 87.91 1054.92 2892.24"
    #   "Overtime 18.00 0.00 0.00 6.30"
    #   "Paid Time Off New Hire 12.00 8.00 96.00 96.00"
    # Excludes "Gross Pay" summary line via negative lookahead.
    _RE_EARNING_STANDARD = re.compile(
        r'^(?!Gross Pay)([A-Za-z][A-Za-z\s]+?)\s+'
        r'(\d+\.\d{2})\s+'       # rate
        r'(\d+\.\d{2})\s+'       # hours
        r'([\d,]+\.\d{2})\s+'    # amount
        r'([\d,]+\.\d{2})$'      # ytd
    )

    # Earnings line without rate/hours (2 numbers):
    #   "Bonus 0.00 150.00"
    #   "Bonus 150.00 150.00"
    _RE_EARNING_NO_RATE = re.compile(
        r'^(?!Gross Pay|Net Pay|W/H|Deductions|Employee)([A-Za-z][A-Za-z\s]+?)\s+'
        r'([\d,]+\.\d{2})\s+'    # amount
        r'([\d,]+\.\d{2})$'      # ytd
    )

    def _parse_earnings(self, text: str) -> List[Dict[str, Any]]:
        """Extract earnings breakdown."""
        earnings = []

        # Find earnings section: from "Earnings" line to "Gross Pay" line
        earnings_section = re.search(
            r'(?:^|\n)Earnings\n(.*?)Gross Pay',
            text,
            re.DOTALL
        )

        if not earnings_section:
            return earnings

        lines = earnings_section.group(1).strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Pattern 1: Standard line (Rate Hours Amount YTD)
            match = self._RE_EARNING_STANDARD.match(line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": None,
                    "hours": self._parse_decimal(match.group(3)),
                    "rate": self._parse_decimal(match.group(2)),
                    "amount": self._parse_decimal(match.group(4)),
                    "ytd": self._parse_decimal(match.group(5))
                })
                continue

            # Pattern 2: No-rate line (Amount YTD only)
            match = self._RE_EARNING_NO_RATE.match(line)
            if match:
                earnings.append({
                    "description": match.group(1).strip(),
                    "dates": None,
                    "hours": 0,
                    "rate": 0,
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })
                continue

        return earnings

    def _parse_taxes(self, text: str) -> List[Dict[str, Any]]:
        """Extract W/H Taxes section."""
        taxes = []

        # Between "W/H Taxes" and "Deductions"
        tax_section = re.search(
            r'W/H Taxes\n(.*?)(?:Deductions|Net Pay)',
            text,
            re.DOTALL
        )

        if not tax_section:
            return taxes

        lines = tax_section.group(1).strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # "Federal W/H(M) 0.00 0.00" or "Medicare 15.30 44.52"
            match = re.match(r'(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$', line)
            if match:
                taxes.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return taxes

    def _parse_summary(self, text: str) -> Dict[str, Any]:
        """Extract summary totals (Gross Pay, taxes, Net Pay)."""
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

        # Gross Pay: "Gross Pay 87.91 1054.92 3069.78"
        # Format: Gross Pay <hours> <current_amount> <ytd_amount>
        gross_match = re.search(
            r'Gross Pay\s+[\d\.]+\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})',
            text
        )
        if gross_match:
            summary["current"]["gross_pay"] = self._parse_decimal(gross_match.group(1))
            summary["ytd"]["gross_pay"] = self._parse_decimal(gross_match.group(2))

        # Net Pay: "Net Pay 974.21 2834.93 Voucher No. ..."
        net_match = re.search(
            r'Net Pay\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})',
            text
        )
        if net_match:
            summary["current"]["net_pay"] = self._parse_decimal(net_match.group(1))
            summary["ytd"]["net_pay"] = self._parse_decimal(net_match.group(2))

        # Sum taxes from W/H Taxes section
        taxes = self._parse_taxes(text)
        summary["current"]["employee_taxes"] = sum(t["amount"] for t in taxes)
        summary["ytd"]["employee_taxes"] = sum(t["ytd"] for t in taxes)

        return summary

    def _parse_payment_info(self, text: str) -> List[Dict[str, Any]]:
        """Extract Net Pay Distribution (bank account splits)."""
        payments = []

        # Between "Net Pay Distribution" and "Employee Benefits"
        payment_section = re.search(
            r'Net Pay Distribution\n(.*?)(?:Employee Benefits|Voucher No\.|$)',
            text,
            re.DOTALL
        )

        if not payment_section:
            return payments

        lines = payment_section.group(1).strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # "Direct Deposit Net Check 292.26 850.47 A/C:9315"
            # "Direct Dep. Distribution 1 409.17 1190.67 A/C:9239"
            match = re.match(
                r'(.+?)\s+([\d,]+\.\d{2})\s+[\d,]+\.\d{2}\s+A/C:(\d+)$',
                line
            )
            if match:
                account_last4 = match.group(3)
                payments.append({
                    "bank_name": "Unknown",
                    "account_name": match.group(1).strip(),
                    "account_number": f"****{account_last4}",
                    "amount": self._parse_decimal(match.group(2)),
                    "currency": "USD"
                })

        return payments

    def _validate(self, paystub: Dict[str, Any]) -> None:
        """Post-parse validation warnings."""
        header = paystub.get("header", {})
        summary = paystub.get("summary", {})
        earnings = paystub.get("earnings", [])
        payments = paystub.get("payment_info", [])

        emp_id = header.get("employee", {}).get("id")
        if not emp_id:
            logger.error("Missing employee ID - auto-matching will fail")

        begin = header.get("pay_period", {}).get("begin")
        if not begin:
            logger.error("Missing pay period begin date - paystub will be skipped")

        # Earnings sum vs gross pay
        earnings_total = sum(e.get("amount", 0) for e in earnings)
        gross_pay = summary.get("current", {}).get("gross_pay", 0)
        if gross_pay and abs(earnings_total - gross_pay) > 1.0:
            logger.warning(
                f"Earnings sum (${earnings_total:.2f}) != "
                f"Gross Pay (${gross_pay:.2f})"
            )

        # Payment splits vs net pay
        payment_total = sum(p.get("amount", 0) for p in payments)
        net_pay = summary.get("current", {}).get("net_pay", 0)
        if net_pay and abs(payment_total - net_pay) > 0.02:
            logger.warning(
                f"Payment splits (${payment_total:.2f}) != "
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


def parse(text: str, source_file: str = None, **kwargs) -> List[Dict[str, Any]]:
    """
    Parse CONNEXUS paystub text.

    Args:
        text: Extracted PDF text
        source_file: Original filename

    Returns:
        List of parsed paystub dictionaries
    """
    parser = ConnexusParser()
    return parser.parse(text, source_file)
