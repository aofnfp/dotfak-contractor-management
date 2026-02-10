#!/usr/bin/env python3
"""
ADP Paystub Parser — handles BC Forward, IQOR, and other ADP-format paystubs.

Uses pdfplumber word-position extraction to reliably reconstruct numbers
from ADP's space-separated digit format (e.g., "15 5000" → 15.5, "1 387 25" → 1387.25).

ADP uses fixed-width columns with consistent x-positions across all samples:
  - Rate:    x=105-150  (integer + 4-digit decimal)
  - Hours:   x=160-195  (integer + 2-digit decimal)
  - Current: x=205-260  (dollar amount)
  - YTD:     x=290-340  (dollar amount)
"""

import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

try:
    import pdfplumber
except ImportError:
    raise ImportError("pdfplumber required: pip install pdfplumber")

logger = logging.getLogger(__name__)

# Known ADP-format employers
COMPANY_MAP = {
    "BUCHER AND CHRISTIAN": "bc_forward",
    "IQOR": "iqor",
}

# Column x-position ranges (verified across all sample PDFs)
COL_RATE = (105, 150)
COL_HOURS = (158, 196)
COL_CURRENT = (203, 262)
COL_YTD = (288, 342)
COL_DESC = (0, 100)

# Earning line y-tolerance for grouping words into lines
Y_TOLERANCE = 2.0


class ADPParser:
    """Parser for ADP-format paystubs."""

    version = "1.0-ADP-POSITION-PARSER"

    def parse_pdf(self, pdf_path: str, source_file: str = None) -> List[Dict[str, Any]]:
        """Parse an ADP paystub PDF using word-position extraction."""
        results = []

        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                try:
                    words = page.extract_words(x_tolerance=1, y_tolerance=1)
                    text = page.extract_text() or ""

                    result = self._parse_page(words, text, source_file)
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.error(f"Failed to parse page {page_num + 1}: {e}")

        return results

    def _parse_page(self, words: List[Dict], text: str, source_file: str = None) -> Optional[Dict]:
        """Parse a single page of an ADP paystub."""
        if not words:
            return None

        # Clean text lines (skip garbled font noise)
        lines = [l for l in text.split('\n') if not self._is_garbled(l)]
        if not lines:
            return None

        # Detect organization
        organization = self._detect_organization(text)

        # Group words by y-position (lines)
        word_lines = self._group_words_by_line(words)

        # Parse each section
        header = self._parse_header(lines, text, word_lines)
        earnings = self._parse_earnings(word_lines)
        taxes = self._parse_taxes(word_lines)
        summary = self._parse_summary(word_lines, earnings, taxes)
        payment_info = self._parse_payment_info(lines)
        tax_info = self._parse_tax_info(lines)

        if not header.get('pay_period', {}).get('begin'):
            return None

        return {
            "metadata": {
                "organization": organization or "adp_unknown",
                "parser_version": self.version,
                "extracted_at": datetime.now().isoformat(),
                "source_file": source_file,
            },
            "header": header,
            "summary": summary,
            "earnings": earnings,
            "taxes": taxes,
            "pre_tax_deductions": [],
            "deductions": [],
            "employer_benefits": [],
            "taxable_wages": [],
            "tax_info": tax_info,
            "payment_info": payment_info,
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _is_garbled(line: str) -> bool:
        return '(cid:' in line or line.startswith('\\@[') or line.startswith('\x00')

    @staticmethod
    def _detect_organization(text: str) -> Optional[str]:
        upper = text.upper()
        for keyword, org in COMPANY_MAP.items():
            if keyword in upper:
                return org
        return None

    @staticmethod
    def _group_words_by_line(words: List[Dict]) -> List[List[Dict]]:
        """Group words by y-position into lines, sorted by x within each line."""
        if not words:
            return []

        sorted_words = sorted(words, key=lambda w: (w['top'], w['x0']))
        lines = []
        current_line = [sorted_words[0]]
        current_y = sorted_words[0]['top']

        for w in sorted_words[1:]:
            if abs(w['top'] - current_y) <= Y_TOLERANCE:
                current_line.append(w)
            else:
                lines.append(current_line)
                current_line = [w]
                current_y = w['top']

        if current_line:
            lines.append(current_line)

        return lines

    @staticmethod
    def _words_in_range(line_words: List[Dict], x_min: float, x_max: float) -> List[Dict]:
        """Get words whose x0 falls within the given range."""
        return [w for w in line_words if x_min <= w['x0'] <= x_max]

    @staticmethod
    def _reconstruct_number(words: List[Dict], is_rate: bool = False) -> Optional[float]:
        """Reconstruct a number from positioned word groups.

        ADP extracts decimals as spaces:
          Rate:   "15" + "5000" → 15.5000
          Amount: "1" + "387" + "25" → 1387.25
          Hours:  "89" + "50" → 89.50, "55" alone → 0.55
        """
        groups = [w['text'].replace('$', '').replace('-', '') for w in words]
        groups = [g for g in groups if g and g[0].isdigit()]
        if not groups:
            return None

        if is_rate:
            if len(groups) == 2 and len(groups[1]) == 4:
                return float(f"{groups[0]}.{groups[1]}")
            # Single group rate (unlikely but handle)
            return float(''.join(groups))

        # Amount or hours: concatenate, last 2 digits are cents
        digits = ''.join(groups)
        if not digits:
            return None
        if len(digits) <= 2:
            return float(f"0.{digits.zfill(2)}")
        return float(f"{digits[:-2]}.{digits[-2:]}")

    @staticmethod
    def _parse_adp_text_number(text: str) -> Optional[float]:
        """Parse a number from ADP text format (spaces instead of decimals).
        e.g., '$880 00' → 880.0, '$1 400 04' → 1400.04, '-54 56' → 54.56
        """
        cleaned = text.strip().replace('$', '').replace(',', '')
        is_negative = '-' in cleaned
        cleaned = cleaned.replace('-', '').strip()
        parts = cleaned.split()
        if not parts:
            return None
        digits = ''.join(parts)
        if not digits or not digits.replace('.', '').isdigit():
            return None
        # If already has a decimal point, parse directly
        if '.' in digits:
            val = float(digits)
        elif len(digits) <= 2:
            val = float(f"0.{digits.zfill(2)}")
        else:
            val = float(f"{digits[:-2]}.{digits[-2:]}")
        return -val if is_negative else val

    # ── Section Parsers ──────────────────────────────────────────────────

    def _parse_header(self, lines: List[str], full_text: str, word_lines: List[List[Dict]]) -> Dict:
        """Extract header info: company, employee, dates, etc."""
        header = {
            "company": {"name": "", "address": ""},
            "employee": {"name": "", "id": None},
            "pay_period": {"begin": "", "end": ""},
            "check_date": "",
            "check_number": "",
        }

        # Period dates
        begin_match = re.search(r'Period Beginning:\s*(\d{2}/\d{2}/\d{4})', full_text)
        end_match = re.search(r'Period Ending:\s*(\d{2}/\d{2}/\d{4})', full_text)
        pay_date_match = re.search(r'Pay Date:\s*(\d{2}/\d{2}/\d{4})', full_text)
        advice_match = re.search(r'Advice number:\s*(\d+)', full_text)

        if begin_match:
            header["pay_period"]["begin"] = self._convert_date(begin_match.group(1))
        if end_match:
            header["pay_period"]["end"] = self._convert_date(end_match.group(1))
        if pay_date_match:
            header["check_date"] = self._convert_date(pay_date_match.group(1))
        if advice_match:
            header["check_number"] = advice_match.group(1)

        # Company name and address
        for line in lines:
            for keyword in COMPANY_MAP:
                if keyword in line.upper():
                    # Company name is this line (before "Period")
                    name_part = re.split(r'\s+Period\s', line)[0].strip()
                    header["company"]["name"] = name_part
                    break
            if header["company"]["name"]:
                break

        # Collect address lines (between company name and employee)
        addr_lines = []
        found_company = False
        for line in lines:
            if header["company"]["name"] and header["company"]["name"] in line:
                found_company = True
                continue
            if found_company:
                # Stop at employee name (all caps, no numbers/colons)
                if re.match(r'^[A-Z][A-Z\s]+$', line.strip()) and ':' not in line:
                    header["employee"]["name"] = line.strip()
                    break
                # Address lines contain numbers or state abbreviations
                clean = re.split(r'\s+Period\s|\s+Pay Date', line)[0].strip()
                if clean and 'COMPANY PH' not in clean:
                    addr_lines.append(clean)

        header["company"]["address"] = ', '.join(addr_lines)

        # Employee ID — BC Forward has "6A2 124696 LBCOGS 0000060560 1" on line 2
        emp_id_match = re.search(r'^\w+\s+(\d{5,})\s+\w+\s+\d+\s+\d+$', full_text, re.MULTILINE)
        if emp_id_match:
            header["employee"]["id"] = emp_id_match.group(1)

        return header

    @staticmethod
    def _convert_date(date_str: str) -> str:
        """Convert MM/DD/YYYY to YYYY-MM-DD."""
        try:
            dt = datetime.strptime(date_str, "%m/%d/%Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return date_str

    def _parse_earnings(self, word_lines: List[List[Dict]]) -> List[Dict]:
        """Extract earnings using word positions."""
        earnings = []
        in_earnings = False
        earning_descriptions = {'regular', 'overtime', 'holiday', 'vacation', 'sick', 'pto',
                                'bonus', 'commission', 'incentive', 'differential', 'premium',
                                'double time', 'shift'}

        for line_words in word_lines:
            if not line_words:
                continue

            line_text = ' '.join(w['text'] for w in line_words).lower()

            # Start after "rate hours" header
            if 'rate' in line_text and 'hours' in line_text:
                in_earnings = True
                continue

            # Stop at "Gross Pay"
            if 'gross' in line_text and 'pay' in line_text:
                in_earnings = False
                continue

            if not in_earnings:
                continue

            # Get description (words in left column)
            desc_words = self._words_in_range(line_words, *COL_DESC)
            if not desc_words:
                continue

            description = ' '.join(w['text'] for w in desc_words).strip()

            # Check if this looks like an earning line
            desc_lower = description.lower()
            if not any(k in desc_lower for k in earning_descriptions):
                continue

            # Extract numbers from column positions
            rate_words = self._words_in_range(line_words, *COL_RATE)
            hours_words = self._words_in_range(line_words, *COL_HOURS)
            current_words = self._words_in_range(line_words, *COL_CURRENT)
            ytd_words = self._words_in_range(line_words, *COL_YTD)

            rate = self._reconstruct_number(rate_words, is_rate=True)
            hours = self._reconstruct_number(hours_words)
            current = self._reconstruct_number(current_words)
            ytd = self._reconstruct_number(ytd_words)

            # Must have at least current or YTD amount
            if current is None and ytd is None:
                continue
            # Skip zero-amount lines (e.g., Overtime with no hours this period)
            if (current is None or current == 0) and (ytd is None or ytd == 0):
                continue

            earning = {
                "description": description,
                "hours": hours or 0,
                "rate": rate or 0,
                "amount": current or 0,
                "ytd": ytd or 0,
            }
            earnings.append(earning)

        return earnings

    def _parse_taxes(self, word_lines: List[List[Dict]]) -> List[Dict]:
        """Extract tax deductions using position-based word extraction."""
        taxes = []
        tax_keywords = {
            'social security tax': 'Social Security Tax',
            'medicare tax': 'Medicare Tax',
            'federal withholding': 'Federal Withholding',
            'state tax': 'State Tax',
            'state income tax': 'State Tax',
        }

        for line_words in word_lines:
            if not line_words:
                continue

            line_text = ' '.join(w['text'] for w in line_words).lower()

            for keyword, name in tax_keywords.items():
                if keyword in line_text:
                    current_words = self._words_in_range(line_words, *COL_CURRENT)
                    ytd_words = self._words_in_range(line_words, *COL_YTD)

                    current = self._reconstruct_number(current_words)
                    ytd = self._reconstruct_number(ytd_words)

                    if current is not None:
                        taxes.append({
                            "description": name,
                            "amount": abs(current),
                            "ytd": abs(ytd) if ytd else 0,
                        })
                    break  # Don't match multiple keywords on same line

        return taxes

    def _parse_summary(self, word_lines: List[List[Dict]], earnings: List[Dict], taxes: List[Dict]) -> Dict:
        """Build summary using position-based word extraction."""
        current_gross = 0.0
        ytd_gross = 0.0
        current_net = 0.0
        ytd_net = 0.0

        for line_words in word_lines:
            if not line_words:
                continue

            line_text = ' '.join(w['text'] for w in line_words).lower()

            if 'gross' in line_text and 'pay' in line_text:
                current_words = self._words_in_range(line_words, *COL_CURRENT)
                ytd_words = self._words_in_range(line_words, *COL_YTD)
                current_gross = self._reconstruct_number(current_words) or 0
                ytd_gross = self._reconstruct_number(ytd_words) or 0

            elif 'net' in line_text and 'pay' in line_text:
                current_words = self._words_in_range(line_words, *COL_CURRENT)
                ytd_words = self._words_in_range(line_words, *COL_YTD)
                current_net = self._reconstruct_number(current_words) or 0
                ytd_net = self._reconstruct_number(ytd_words) or 0

        total_taxes = sum(t['amount'] for t in taxes)

        return {
            "current": {
                "gross_pay": current_gross,
                "pre_tax_deductions": 0,
                "employee_taxes": round(total_taxes, 2),
                "deductions": 0,
                "net_pay": current_net,
            },
            "ytd": {
                "gross_pay": ytd_gross,
                "pre_tax_deductions": 0,
                "employee_taxes": round(sum(t.get('ytd', 0) for t in taxes), 2),
                "deductions": 0,
                "net_pay": ytd_net,
            },
        }

    def _parse_payment_info(self, lines: List[str]) -> List[Dict]:
        """Extract payment/deposit information."""
        payments = []
        full_text = '\n'.join(lines)

        # Look for deposit line: "ABRAHAM OLADOTUN xxxxxxxxxxxx4905 xxxx xxxx $812 68"
        deposit_match = re.search(
            r'[A-Z]+\s+[A-Z]+\s+(x{4,}\d{4})\s+.*?\$\s*([\d\s]+)',
            full_text
        )
        if deposit_match:
            account = deposit_match.group(1)
            amount = self._parse_adp_text_number(deposit_match.group(2))

            # Get account name from "Checking" lines
            acct_name = "Direct Deposit"
            checking_match = re.search(r'(Checking\s*\d*)', full_text)
            if checking_match:
                acct_name = checking_match.group(1).strip()

            if amount:
                payments.append({
                    "bank_name": "",
                    "account_name": acct_name,
                    "account_number": account,
                    "amount": abs(amount),
                    "currency": "USD",
                })

        return payments

    def _parse_tax_info(self, lines: List[str]) -> Dict:
        """Extract tax filing information."""
        full_text = '\n'.join(lines)

        # Filing status
        status_match = re.search(r'Filing Status:\s*(.+)', full_text)
        marital = status_match.group(1).strip() if status_match else ""
        # Clean: remove address that might be on same line
        marital = re.split(r'\d{5}', marital)[0].strip()
        marital = re.split(r'\s{3,}', marital)[0].strip()

        return {
            "marital_status": marital,
            "federal_allowances": 0,
            "state_allowances": 0,
            "additional_withholding": 0,
        }


# ── Module-level entry point ────────────────────────────────────────────

def parse(text: str, source_file: str = None, pdf_path: str = None, **kwargs) -> List[Dict[str, Any]]:
    """
    Entry point for the ADP parser.

    Args:
        text: Extracted text (used as fallback; ADP format requires pdf_path for reliable parsing)
        source_file: Original filename
        pdf_path: Path to the PDF file (required for position-based parsing)

    Returns:
        List of parsed paystub dictionaries
    """
    if not pdf_path:
        logger.error("ADP parser requires pdf_path for position-based number extraction")
        return []

    parser = ADPParser()
    return parser.parse_pdf(pdf_path, source_file)
