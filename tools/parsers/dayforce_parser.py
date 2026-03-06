#!/usr/bin/env python3
"""
Parser for Dayforce paystub format (e.g., Data Recognition Corporation).

This parser uses regex patterns to extract data from Dayforce-generated
paystub PDFs. Each PDF has two logical sections:
  - Page 1: Main earnings statement with current/YTD columns
  - Page 3: Supplemental earnings statement with weekly breakdowns

The parser extracts from Page 1 (the main statement) since it contains
all summary totals. Page 3 (supplemental) provides weekly detail but
is not needed for the standard paystub record.

Text layout from pdfplumber:
  - Header fields are interleaved across two columns (employee left, pay info right)
  - Earnings/Taxes sections use "$" prefixed amounts
  - Direct deposit info includes routing and masked account numbers
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class DayforceParser:
    """Parser for Dayforce paystub format."""

    def __init__(self):
        self.version = "1.0-DAYFORCE-PARSER"
        self.organization = "data_recognition"

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

        # Find main earnings statement pages (contain "Net Pay" but not "Supplemental")
        main_pages = []
        for page in pages:
            if re.search(r'Net Pay', page) and not re.search(r'Supplemental', page):
                main_pages.append(page)

        paystubs = []
        for page in main_pages:
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
            "pre_tax_deductions": [],
            "deductions": [],
            "employer_benefits": [],
            "taxable_wages": [],
            "tax_info": self._parse_tax_info(text),
            "payment_info": self._parse_payment_info(text)
        }

        self._validate(paystub)
        return paystub

    def _parse_header(self, text: str) -> Dict[str, Any]:
        """Extract header information.

        Dayforce PDFs use a two-column layout where left-column fields
        (employee info, employer info) interleave with right-column fields
        (pay date, pay period, filing status). This means multi-line fields
        are split by unrelated content from the other column.
        """
        header = {
            "company": {"name": "", "address": ""},
            "employee": {"name": "", "id": None, "address": ""},
            "pay_period": {},
            "check_date": None,
            "check_number": None
        }

        # Employee name: "Employee Name: Abraham Oladotun Pay Date: ..."
        # Note: sometimes only single space separates name from "Pay Date:"
        name_match = re.search(r'Employee Name:\s*(.+?)\s+Pay Date:', text)
        if name_match:
            header["employee"]["name"] = name_match.group(1).strip()

        # Employee ID
        emp_id_match = re.search(r'Employee #:\s*(\d+)', text)
        if emp_id_match:
            header["employee"]["id"] = emp_id_match.group(1).strip()

        # Employee address: spans two lines in left column
        # Line: "Employee Address: 19919 Malin Manor Ln 3/1/2026"
        # Line: "Katy, TX 77449 Deposit Advice #: ..."
        # The address part is before the right-column date/field
        addr_line1 = re.search(
            r'Employee Address:\s*(.+?)\s+\d{1,2}/\d{1,2}/\d{4}$',
            text, re.MULTILINE
        )
        addr_line2 = re.search(
            r'^(\w.+?,\s*\w{2}\s+\d{5})',
            text, re.MULTILINE
        )
        if addr_line1 and addr_line2:
            header["employee"]["address"] = (
                addr_line1.group(1).strip() + ", " + addr_line2.group(1).strip()
            )
        elif addr_line1:
            header["employee"]["address"] = addr_line1.group(1).strip()

        # Employer name: split across lines by right-column content
        # "Employer Name: Data Recognition"
        # "Federal 2c/Extra No/$0.00"
        # "Corporation"
        employer_match = re.search(r'Employer Name:\s*(.+?)$', text, re.MULTILINE)
        if employer_match:
            name = employer_match.group(1).strip()
            # Look for continuation: line after "Federal 2c/Extra..." that is
            # a single word (the rest of the company name)
            continuation = re.search(
                r'Employer Name:\s*.+?\n.*?\n(\w+)\n',
                text
            )
            if continuation:
                candidate = continuation.group(1).strip()
                # Only append if it looks like a name continuation
                # (not a field label like "Employer", "Withholding", etc.)
                if candidate not in ('Employer', 'Withholding', 'Employee'):
                    name += " " + candidate
            header["company"]["name"] = name

        # Employer address: split across two lines
        # "Employer 13490 Bass Lake Road"
        # "State Exemptions: (TX)"
        # "Address: Maple Grove, MN 55311"
        street_match = re.search(r'^Employer\s+(\d+.+?)$', text, re.MULTILINE)
        city_match = re.search(r'^Address:\s*(.+?)$', text, re.MULTILINE)
        if street_match and city_match:
            header["company"]["address"] = (
                street_match.group(1).strip() + ", " + city_match.group(1).strip()
            )

        # Pay date (check date)
        pay_date_match = re.search(r'Pay Date:\s*(\d{1,2}/\d{1,2}/\d{4})', text)
        if pay_date_match:
            header["check_date"] = self._parse_date(pay_date_match.group(1))

        # Pay period: start date on one line, end date at end of next line
        # "Pay Period: 2/16/2026 -"
        # "Employee Address: 19919 Malin Manor Ln 3/1/2026"
        period_start = re.search(r'Pay Period:\s*(\d{1,2}/\d{1,2}/\d{4})\s*-', text)
        if period_start:
            header["pay_period"]["begin"] = self._parse_date(period_start.group(1))
            # End date is the date at end of the next line
            period_end = re.search(
                r'Pay Period:\s*\d{1,2}/\d{1,2}/\d{4}\s*-\s*\n.+?(\d{1,2}/\d{1,2}/\d{4})',
                text
            )
            if period_end:
                header["pay_period"]["end"] = self._parse_date(period_end.group(1))

        # Deposit Advice # (check number equivalent)
        advice_match = re.search(r'Deposit Advice #:\s*(\d+)', text)
        if advice_match:
            header["check_number"] = advice_match.group(1).strip()

        return header

    def _parse_earnings(self, text: str) -> List[Dict[str, Any]]:
        """Extract earnings breakdown from the current period columns."""
        earnings = []

        # Pattern: "Regular 70.50 18.0000 $1,269.00 70.50 $1,269.00"
        # earning_name hours rate $current_amount ytd_hours $ytd_amount
        earning_pattern = re.compile(
            r'^(Regular|Overtime|Holiday|PTO|Sick|Bonus|Commission|'
            r'Vacation|Personal|Bereavement|Jury Duty|Other|[A-Za-z][\w\s]+?)\s+'
            r'(\d+[\d,.]*)\s+'            # hours
            r'(\d+\.\d{4})\s+'            # rate (4 decimal places)
            r'\$([\d,]+\.\d{2})\s+'       # current amount
            r'(\d+[\d,.]*)\s+'            # ytd hours
            r'\$([\d,]+\.\d{2})$',        # ytd amount
            re.MULTILINE
        )

        for match in earning_pattern.finditer(text):
            earnings.append({
                "description": match.group(1).strip(),
                "dates": None,
                "hours": self._parse_decimal(match.group(2)),
                "rate": self._parse_decimal(match.group(3)),
                "amount": self._parse_decimal(match.group(4)),
                "ytd": self._parse_decimal(match.group(6))
            })

        # Also handle earnings without rate/hours (bonus-type):
        # "Bonus $150.00 $150.00"
        bonus_pattern = re.compile(
            r'^(Bonus|Commission|Stipend|Allowance|[A-Za-z][\w\s]+?)\s+'
            r'\$([\d,]+\.\d{2})\s+'
            r'\$([\d,]+\.\d{2})$',
            re.MULTILINE
        )

        # Only add if not already captured by the main pattern
        existing_descriptions = {e["description"] for e in earnings}
        for match in bonus_pattern.finditer(text):
            desc = match.group(1).strip()
            if desc not in existing_descriptions and desc not in (
                'Earnings', 'Taxes', 'Net Pay', 'FICA EE', 'Fed MWT EE',
                'Direct Deposit'
            ):
                earnings.append({
                    "description": desc,
                    "dates": None,
                    "hours": 0,
                    "rate": 0,
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return earnings

    def _parse_taxes(self, text: str) -> List[Dict[str, Any]]:
        """Extract tax deductions."""
        taxes = []

        # Pattern: "FICA EE $78.68 $78.68"
        # Tax lines appear between "Taxes" and "Routing #" or "Net Pay"
        tax_section = re.search(
            r'Taxes\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})\n(.*?)(?=Routing #|Net Pay)',
            text,
            re.DOTALL
        )

        if not tax_section:
            return taxes

        lines = tax_section.group(3).strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # "FICA EE $78.68 $78.68"
            match = re.match(
                r'(.+?)\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})',
                line
            )
            if match:
                taxes.append({
                    "description": match.group(1).strip(),
                    "amount": self._parse_decimal(match.group(2)),
                    "ytd": self._parse_decimal(match.group(3))
                })

        return taxes

    def _parse_summary(self, text: str) -> Dict[str, Any]:
        """Extract summary totals."""
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

        # Earnings total line: "Earnings 70.50 $1,269.00 70.50 $1,269.00"
        gross_match = re.search(
            r'^Earnings\s+[\d.]+\s+\$([\d,]+\.\d{2})\s+[\d.]+\s+\$([\d,]+\.\d{2})',
            text,
            re.MULTILINE
        )
        if gross_match:
            summary["current"]["gross_pay"] = self._parse_decimal(gross_match.group(1))
            summary["ytd"]["gross_pay"] = self._parse_decimal(gross_match.group(2))

        # Taxes total line: "Taxes $97.08 $97.08"
        taxes_match = re.search(
            r'^Taxes\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})',
            text,
            re.MULTILINE
        )
        if taxes_match:
            summary["current"]["employee_taxes"] = self._parse_decimal(taxes_match.group(1))
            summary["ytd"]["employee_taxes"] = self._parse_decimal(taxes_match.group(2))

        # Net Pay line: "Net Pay $1,171.92 $1,171.92"
        net_match = re.search(
            r'^Net Pay\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})',
            text,
            re.MULTILINE
        )
        if net_match:
            summary["current"]["net_pay"] = self._parse_decimal(net_match.group(1))
            summary["ytd"]["net_pay"] = self._parse_decimal(net_match.group(2))

        return summary

    def _parse_tax_info(self, text: str) -> Dict[str, Any]:
        """Extract tax filing information."""
        tax_info = {}

        filing_match = re.search(r'Federal Filing Status:\s*(\w+)', text)
        if filing_match:
            tax_info["federal_filing_status"] = filing_match.group(1).strip()

        state_match = re.search(r'State Filing Status:\s*\((\w+)\)', text)
        if state_match:
            tax_info["state"] = state_match.group(1).strip()

        freq_match = re.search(r'Pay Frequency:\s*(\S+)', text)
        if freq_match:
            tax_info["pay_frequency"] = freq_match.group(1).strip()

        pay_type_match = re.search(r'Pay Type:\s*(\w+)', text)
        if pay_type_match:
            tax_info["pay_type"] = pay_type_match.group(1).strip()

        rate_match = re.search(r'Pay Rate:\s*([\d.]+)', text)
        if rate_match:
            tax_info["pay_rate"] = self._parse_decimal(rate_match.group(1))

        return tax_info

    def _parse_payment_info(self, text: str) -> List[Dict[str, Any]]:
        """Extract direct deposit / payment information."""
        payments = []

        # Pattern: "Direct Deposit 084106768 XXXXXXXXXXXX4905 $1,171.92"
        deposit_pattern = re.compile(
            r'Direct Deposit\s+(\d+)\s+(\S+?)(\d{4})\s+\$([\d,]+\.\d{2})'
        )

        for match in deposit_pattern.finditer(text):
            routing = match.group(1)
            account_mask = match.group(2) + match.group(3)
            last4 = match.group(3)
            amount = self._parse_decimal(match.group(4))

            payments.append({
                "bank_name": "Unknown",
                "account_name": "Direct Deposit",
                "routing_number": routing,
                "account_number": f"****{last4}",
                "amount": amount,
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

        # Net pay validation: gross - taxes = net
        taxes = summary.get("current", {}).get("employee_taxes", 0)
        net_pay = summary.get("current", {}).get("net_pay", 0)
        expected_net = gross_pay - taxes
        if net_pay and abs(expected_net - net_pay) > 1.0:
            logger.warning(
                f"Expected net (${expected_net:.2f}) != "
                f"Actual net (${net_pay:.2f})"
            )

        # Payment splits vs net pay
        payment_total = sum(p.get("amount", 0) for p in payments)
        if net_pay and abs(payment_total - net_pay) > 0.02:
            logger.warning(
                f"Payment splits (${payment_total:.2f}) != "
                f"Net Pay (${net_pay:.2f})"
            )

    def _parse_date(self, date_str: str) -> str:
        """Convert M/D/YYYY to YYYY-MM-DD."""
        try:
            dt = datetime.strptime(date_str.strip(), "%m/%d/%Y")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            return date_str

    def _parse_decimal(self, value_str: str) -> float:
        """Parse string to float, handling commas and dollar signs."""
        if not value_str:
            return 0.0
        try:
            return float(value_str.replace(',', '').replace('$', '').strip())
        except Exception:
            return 0.0


def parse(text: str, source_file: str = None, **kwargs) -> List[Dict[str, Any]]:
    """
    Parse Dayforce paystub text.

    Args:
        text: Extracted PDF text
        source_file: Original filename

    Returns:
        List of parsed paystub dictionaries
    """
    parser = DayforceParser()
    return parser.parse(text, source_file)
