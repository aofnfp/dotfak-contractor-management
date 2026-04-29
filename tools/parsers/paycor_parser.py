#!/usr/bin/env python3
"""
Parser for Paycor-generated paystubs (e.g., Measurement Incorporated).

Paycor paystubs use a two-column layout where check-stub data and the
deposit advice body are interleaved. The check stub is always single-paystub,
but a PDF may bundle multiple pay periods (one per page) so we iterate pages.

Layout notes from pdfplumber:
  - Top "check" block: employer block on the left, check #/date/net amount on the right.
  - Body block: employee info (left) and employer info (right) on the same line.
  - Earnings table uses 4-decimal RATE column then HOUR/UNIT, CURRENT, YTD HOUR/UNIT, YTD.
  - Taxes table uses short codes (MED, SOC) with a "Total" row prefixed with "$".
  - Net Pay sits on its own line with a single "$" amount.
  - Bank shown on the void advice (e.g., FIFTH THIRD BANK) but NO account number
    is printed, so payment_info carries the bank name with account_number=None.
    Auto-match will skip these and an admin will assign them once.
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class PaycorParser:
    """Parser for Paycor paystub format."""

    def __init__(self):
        self.version = "1.0-PAYCOR-PARSER"
        self.organization = "measurement_incorporated"

    def parse(self, text: str, source_file: str = None, **kwargs) -> List[Dict[str, Any]]:
        """Parse paystub text into one paystub dict per page."""
        pages = self._split_pages(text)

        paystubs = []
        for page in pages:
            try:
                paystub = self._parse_single_paystub(page, source_file)
                if paystub:
                    paystubs.append(paystub)
            except Exception as e:
                logger.warning(f"Failed to parse Paycor page: {e}")
                continue

        return paystubs

    def _split_pages(self, text: str) -> List[str]:
        """Split text into individual pages using extract_pdf_text's separator."""
        pages = re.split(r'={80}\nPAGE \d+\n={80}', text)
        return [p.strip() for p in pages if p.strip()]

    def _parse_single_paystub(self, text: str, source_file: str = None) -> Optional[Dict[str, Any]]:
        """Parse a single paystub from page text."""
        header = self._parse_header(text)

        # Skip pages that don't look like a paystub (no pay period found)
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
            "taxable_wages": [],
            "tax_info": self._parse_tax_info(text),
            "payment_info": self._parse_payment_info(text)
        }

        self._validate(paystub)
        return paystub

    def _parse_header(self, text: str) -> Dict[str, Any]:
        """Extract employer, employee, pay period, and check info."""
        header = {
            "company": {"name": "", "address": "", "phone": "", "fein": ""},
            "employee": {"name": "", "id": None, "address": "", "department": "", "title": ""},
            "pay_period": {},
            "check_date": None,
            "check_number": None
        }

        # Employee name from the check stub: "PAY <name> Pay this Amount"
        name_match = re.search(r'^PAY\s+(.+?)\s+Pay this Amount\s*$', text, re.MULTILINE)
        if name_match:
            header["employee"]["name"] = name_match.group(1).strip()

        # Employer name: the very first non-empty line of the page, with the
        # trailing tracking number (e.g., "MEASUREMENT INCORPORATED 166860") stripped.
        first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
        header["company"]["name"] = re.sub(r'\s+\d+\s*$', '', first_line)

        # Employee address from the check stub (one field per labeled line):
        #   "TO THE 19919 MALIN MANOR LN $**497.44"
        #   "ORDER KATY TX 77449-1651"
        street_match = re.search(
            r'^TO THE\s+(.+?)\s+\$\*+[\d,]+\.\d{2}\s*$',
            text, re.MULTILINE
        )
        city_match = re.search(r'^ORDER\s+(.+?)\s*$', text, re.MULTILINE)
        if street_match and city_match:
            header["employee"]["address"] = (
                street_match.group(1).strip() + ", " + city_match.group(1).strip()
            )

        # Employer address from the top check header. The header interleaves
        # employer info (left) with check metadata (right) so we filter the
        # noise lines out:
        #   "MEASUREMENT INCORPORATED 166860"   <- already captured as name
        #   "13-31/420"                          <- routing fraction (skip)
        #   "215 MORRIS ST"                      <- street
        #   "Check # 39108738"                   <- skip
        #   "DURHAM NC 27701"                    <- city/state/zip
        #   "Date 04/24/2026"                    <- skip
        header_lines = text.splitlines()[:10]
        emp_street = ""
        emp_city = ""
        for line in header_lines:
            stripped = line.strip()
            if not stripped:
                continue
            # Street: starts with a number, has letters, isn't a routing fraction
            if not emp_street and re.match(r'^\d+\s+[A-Za-z]', stripped):
                emp_street = stripped
                continue
            # City/State/Zip: "<words> <2-letter state> <5-digit zip>"
            if not emp_city and re.match(r'^[A-Z][A-Za-z\s]+\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?$', stripped):
                emp_city = stripped
        if emp_street and emp_city:
            header["company"]["address"] = emp_street + ", " + emp_city

        # Employer phone: "(919)683-2413"
        phone_match = re.search(r'\((\d{3})\)\s*(\d{3})-(\d{4})', text)
        if phone_match:
            header["company"]["phone"] = (
                f"({phone_match.group(1)}){phone_match.group(2)}-{phone_match.group(3)}"
            )

        # FEIN: "FEIN: 56-1264255"
        fein_match = re.search(r'FEIN:\s*([\d-]+)', text)
        if fein_match:
            header["company"]["fein"] = fein_match.group(1).strip()

        # Employee ID: "EMPLOYEE ID: 988434"
        emp_id_match = re.search(r'EMPLOYEE ID:\s*(\d+)', text)
        if emp_id_match:
            header["employee"]["id"] = emp_id_match.group(1).strip()

        # Department: "DEPARTMENT: 14018 FEIN: 56-1264255"
        dept_match = re.search(r'DEPARTMENT:\s*(\d+)', text)
        if dept_match:
            header["employee"]["department"] = dept_match.group(1).strip()

        # Job title: line between "EMPLOYEE ID: NNNN" and "DEPARTMENT: NNNN"
        # In the sample, this is "Reader" on its own line.
        title_match = re.search(
            r'EMPLOYEE ID:\s*\d+\s*\n([^\n]+?)\s*\nDEPARTMENT:',
            text
        )
        if title_match:
            candidate = title_match.group(1).strip()
            # Skip if this happens to capture something else (e.g., a date)
            if candidate and not re.match(r'^\d', candidate):
                header["employee"]["title"] = candidate

        # Pay period: "Pay Period 04/05/2026 - 04/18/2026"
        period_match = re.search(
            r'Pay Period\s+(\d{1,2}/\d{1,2}/\d{4})\s*-\s*(\d{1,2}/\d{1,2}/\d{4})',
            text
        )
        if period_match:
            header["pay_period"]["begin"] = self._parse_date(period_match.group(1))
            header["pay_period"]["end"] = self._parse_date(period_match.group(2))

        # Pay date: "Pay Date 04/24/2026"
        pay_date_match = re.search(r'Pay Date\s+(\d{1,2}/\d{1,2}/\d{4})', text)
        if pay_date_match:
            header["check_date"] = self._parse_date(pay_date_match.group(1))

        # Check number: "CHECK: 39108738" (body) or "Check # 39108738" (stub)
        check_match = re.search(r'CHECK:\s*(\d+)', text)
        if not check_match:
            check_match = re.search(r'Check\s*#\s*(\d+)', text)
        if check_match:
            header["check_number"] = check_match.group(1).strip()

        return header

    def _parse_summary(self, text: str) -> Dict[str, Any]:
        """Extract gross/taxes/net totals from the body."""
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

        # "Total Gross Earnings $538.65 $538.65"
        gross_match = re.search(
            r'Total Gross Earnings\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})',
            text
        )
        if gross_match:
            summary["current"]["gross_pay"] = self._parse_decimal(gross_match.group(1))
            summary["ytd"]["gross_pay"] = self._parse_decimal(gross_match.group(2))

        # Tax total row inside the Taxes table: "Total $41.21 $41.21"
        # Disambiguate from earnings totals (which start with "Total Gross"/"Total Hours").
        taxes_match = re.search(
            r'^Total\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})\s*$',
            text,
            re.MULTILINE
        )
        if taxes_match:
            summary["current"]["employee_taxes"] = self._parse_decimal(taxes_match.group(1))
            summary["ytd"]["employee_taxes"] = self._parse_decimal(taxes_match.group(2))

        # "Net Pay $497.44" (current only) or "Net Pay $497.44 $497.44" (current + ytd)
        net_match = re.search(
            r'Net Pay\s+\$([\d,]+\.\d{2})(?:\s+\$([\d,]+\.\d{2}))?',
            text
        )
        if net_match:
            summary["current"]["net_pay"] = self._parse_decimal(net_match.group(1))
            if net_match.group(2):
                summary["ytd"]["net_pay"] = self._parse_decimal(net_match.group(2))
            else:
                # YTD net pay isn't always printed; derive from gross - taxes
                summary["ytd"]["net_pay"] = round(
                    summary["ytd"]["gross_pay"] - summary["ytd"]["employee_taxes"], 2
                )

        return summary

    # Earnings rows in the table: "Hourly 15.0000 35.91 538.65 35.91 538.65"
    # Columns: description, RATE (4-decimal), HOUR/UNIT, CURRENT, YTD HOUR/UNIT, YTD
    _RE_EARNING_ROW = re.compile(
        r'^([A-Za-z][A-Za-z\s/&\-]+?)\s+'
        r'(\d+\.\d{4})\s+'           # rate
        r'([\d,]+\.\d{2,4})\s+'      # hours/unit
        r'([\d,]+\.\d{2})\s+'        # current amount
        r'([\d,]+\.\d{2,4})\s+'      # ytd hours/unit
        r'([\d,]+\.\d{2})\s*$',      # ytd amount
        re.MULTILINE
    )

    def _parse_earnings(self, text: str) -> List[Dict[str, Any]]:
        """Extract earnings line items from the Earnings table."""
        earnings = []

        # Constrain matches to the section between "Earnings RATE..." and
        # "Total Gross Earnings" so we don't accidentally pick up tax rows.
        section = re.search(
            r'Earnings\s+RATE\s+HOUR/UNIT\s+CURRENT\s+YTD\s+HOUR/UNIT\s+YTD\s*\n'
            r'(.*?)'
            r'\nTotal Gross Earnings',
            text,
            re.DOTALL
        )
        if not section:
            return earnings

        for match in self._RE_EARNING_ROW.finditer(section.group(1)):
            desc = match.group(1).strip()
            # Skip totals rows in case the regex accidentally captures them
            if desc.lower().startswith(('total ', 'total\t')):
                continue
            earnings.append({
                "description": desc,
                "dates": None,
                "hours": self._parse_decimal(match.group(3)),
                "rate": self._parse_decimal(match.group(2)),
                "amount": self._parse_decimal(match.group(4)),
                "ytd": self._parse_decimal(match.group(6))
            })

        return earnings

    # Tax rows use short codes: "MED 7.81 7.81", "SOC 33.40 33.40"
    _RE_TAX_ROW = re.compile(
        r'^([A-Z][A-Z/]+(?:\s+[A-Z][A-Z/]+)*)\s+'
        r'([\d,]+\.\d{2})\s+'
        r'([\d,]+\.\d{2})\s*$',
        re.MULTILINE
    )

    # Map Paycor short tax codes to descriptive names for downstream display.
    _TAX_CODE_NAMES = {
        "MED": "Medicare",
        "SOC": "Social Security",
        "FED": "Federal Withholding",
        "FIT": "Federal Withholding",
        "FITWH": "Federal Withholding",
        "FICA": "FICA",
        "SUI": "State Unemployment",
        "SDI": "State Disability",
    }

    def _parse_taxes(self, text: str) -> List[Dict[str, Any]]:
        """Extract employee tax line items from the Taxes table."""
        taxes = []

        section = re.search(
            r'Taxes\s+CURRENT\s+YTD\s*\n'
            r'(.*?)'
            r'\nTotal\s+\$',
            text,
            re.DOTALL
        )
        if not section:
            return taxes

        for match in self._RE_TAX_ROW.finditer(section.group(1)):
            code = match.group(1).strip()
            taxes.append({
                "description": self._TAX_CODE_NAMES.get(code, code),
                "code": code,
                "amount": self._parse_decimal(match.group(2)),
                "ytd": self._parse_decimal(match.group(3))
            })

        return taxes

    def _parse_tax_info(self, text: str) -> Dict[str, Any]:
        """Extract filing status and state."""
        info = {}

        # "FITWH Filing Status: S Pay Date 04/24/2026"
        filing_match = re.search(r'Filing Status:\s*(\S+)', text)
        if filing_match:
            info["federal_filing_status"] = filing_match.group(1).strip()

        # State indicator on its own line near the filing status block
        # ("TX CHECK: 39108738" — first token is the state code).
        state_match = re.search(r'^([A-Z]{2})\s+CHECK:', text, re.MULTILINE)
        if state_match:
            info["state"] = state_match.group(1)

        return info

    def _parse_payment_info(self, text: str) -> List[Dict[str, Any]]:
        """Extract direct deposit info.

        Paycor void advices show the bank name only (no account number), so
        we emit a single payment entry with bank_name set and account_number
        left None. The bank-account auto-match service skips entries without
        a 4+ digit account number; an admin can assign manually after upload.
        """
        payments = []

        # "Pay this Amount" / "$**497.44" sit near the top of the check stub.
        # The bank name is the line immediately above "Paycor, Inc.".
        amount_match = re.search(r'\$\*+([\d,]+\.\d{2})', text)
        if not amount_match:
            return payments

        amount = self._parse_decimal(amount_match.group(1))

        # Bank name: line directly above the "Paycor, Inc." marker.
        bank_match = re.search(r'^([A-Z][A-Z\s&\.\-,]+?)\s*\nPaycor,\s*Inc\.', text, re.MULTILINE)
        bank_name = bank_match.group(1).strip() if bank_match else ""

        payments.append({
            "bank_name": bank_name,
            "account_name": bank_name,
            "account_number": None,
            "amount": amount,
            "currency": "USD"
        })

        return payments

    def _validate(self, paystub: Dict[str, Any]) -> None:
        """Post-parse validation warnings."""
        header = paystub.get("header", {})
        summary = paystub.get("summary", {})
        earnings = paystub.get("earnings", [])

        period = header.get("pay_period", {}).get("begin", "?")

        if not header.get("employee", {}).get("id"):
            logger.error(f"[{period}] Missing employee ID - auto-matching will fail")

        # Earnings sum vs gross pay
        earnings_total = sum(e.get("amount", 0) for e in earnings)
        gross_pay = summary.get("current", {}).get("gross_pay", 0)
        if gross_pay and abs(earnings_total - gross_pay) > 0.05:
            logger.warning(
                f"[{period}] Earnings sum (${earnings_total:.2f}) != "
                f"Gross Pay (${gross_pay:.2f})"
            )

        # gross - taxes = net
        taxes = summary.get("current", {}).get("employee_taxes", 0)
        net_pay = summary.get("current", {}).get("net_pay", 0)
        expected_net = round(gross_pay - taxes, 2)
        if net_pay and abs(expected_net - net_pay) > 0.05:
            logger.warning(
                f"[{period}] Expected net (${expected_net:.2f}) != "
                f"Actual net (${net_pay:.2f})"
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
        if value_str is None:
            return 0.0
        try:
            return float(str(value_str).replace(',', '').replace('$', '').strip())
        except Exception:
            return 0.0


def parse(text: str, source_file: str = None, **kwargs) -> List[Dict[str, Any]]:
    """Module-level entry point used by the parser registry."""
    parser = PaycorParser()
    return parser.parse(text, source_file)
