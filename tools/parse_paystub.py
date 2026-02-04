#!/usr/bin/env python3
"""
Main orchestration script for parsing paystub PDFs.

This script coordinates PDF text extraction and organization-specific parsing.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

# Import extraction and parsing modules
from extract_pdf_text import extract_text_from_pdf

# Import parser registry
sys.path.insert(0, str(Path(__file__).parent))
from parsers import get_parser, AVAILABLE_PARSERS


def parse_paystub(
    pdf_path: str,
    organization: str,
    output_json: str = None,
    validate_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Parse paystub PDF and extract structured data.

    Args:
        pdf_path: Path to PDF file
        organization: Organization identifier
        output_json: Optional path to save JSON output
        validate_only: If True, validate but don't save

    Returns:
        List of parsed paystub dictionaries

    Raises:
        ValueError: If organization not supported or validation fails
        FileNotFoundError: If PDF file not found
    """
    print(f"Parsing paystub: {pdf_path}")
    print(f"Organization: {organization}")
    print()

    # Step 1: Extract text from PDF
    print("Step 1: Extracting text from PDF...")
    try:
        text = extract_text_from_pdf(pdf_path)
        print(f"✓ Extracted text successfully")
    except Exception as e:
        print(f"✗ Failed to extract text: {e}", file=sys.stderr)
        raise

    # Step 2: Get organization-specific parser
    print(f"\nStep 2: Loading parser for {organization}...")
    try:
        parser_module = get_parser(organization)
        print(f"✓ Loaded parser: {parser_module.__name__}")
    except ValueError as e:
        print(f"✗ {e}", file=sys.stderr)
        raise

    # Step 3: Parse text
    print(f"\nStep 3: Parsing paystub data...")
    try:
        source_filename = Path(pdf_path).name
        paystubs = parser_module.parse(text, source_filename)
        print(f"✓ Parsed {len(paystubs)} paystub(s)")
    except Exception as e:
        print(f"✗ Failed to parse: {e}", file=sys.stderr)
        raise

    # Step 4: Validate
    print(f"\nStep 4: Validating extracted data...")
    errors = validate_paystubs(paystubs)

    if errors:
        print(f"✗ Validation errors found:")
        for error in errors:
            print(f"  - {error}")

        if validate_only:
            raise ValueError(f"Validation failed with {len(errors)} error(s)")
    else:
        print(f"✓ All data validated successfully")

    # Step 5: Save to JSON if requested
    if output_json and not validate_only:
        print(f"\nStep 5: Saving to JSON...")
        try:
            save_json(paystubs, output_json)
            print(f"✓ Saved to: {output_json}")
        except Exception as e:
            print(f"✗ Failed to save JSON: {e}", file=sys.stderr)
            raise

    print(f"\n{'='*60}")
    print(f"SUCCESS: Parsed {len(paystubs)} paystub(s)")
    print(f"{'='*60}")

    return paystubs


def validate_paystubs(paystubs: List[Dict[str, Any]]) -> List[str]:
    """
    Validate parsed paystub data.

    Args:
        paystubs: List of paystub dictionaries

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    if not paystubs:
        errors.append("No paystubs found in document")
        return errors

    for idx, paystub in enumerate(paystubs, 1):
        prefix = f"Paystub {idx}"

        # Check required fields
        if not paystub.get("header", {}).get("employee", {}).get("name"):
            errors.append(f"{prefix}: Missing employee name")

        if not paystub.get("header", {}).get("pay_period", {}).get("begin"):
            errors.append(f"{prefix}: Missing pay period begin date")

        if not paystub.get("header", {}).get("pay_period", {}).get("end"):
            errors.append(f"{prefix}: Missing pay period end date")

        # Validate net pay
        net_pay = paystub.get("summary", {}).get("current", {}).get("net_pay")
        if net_pay is None:
            errors.append(f"{prefix}: Missing net pay")
        elif net_pay < 0:
            errors.append(f"{prefix}: Negative net pay: {net_pay}")

        # Validate gross pay
        gross_pay = paystub.get("summary", {}).get("current", {}).get("gross_pay")
        if gross_pay is None:
            errors.append(f"{prefix}: Missing gross pay")
        elif gross_pay < 0:
            errors.append(f"{prefix}: Negative gross pay: {gross_pay}")

    return errors


def save_json(paystubs: List[Dict[str, Any]], output_path: str):
    """
    Save paystubs to JSON file.

    Args:
        paystubs: List of paystub dictionaries
        output_path: Path to save JSON file
    """
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(paystubs, f, indent=2, ensure_ascii=False)


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Parse paystub PDFs and extract structured data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Available organizations:
{chr(10).join(f'  - {org}' for org in AVAILABLE_PARSERS.keys())}

Example usage:
  python parse_paystub.py paystub.pdf ap_account_services -o output.json
  python parse_paystub.py paystub.pdf ap_account_services --validate-only
        """
    )

    parser.add_argument(
        "pdf_path",
        help="Path to the paystub PDF file"
    )
    parser.add_argument(
        "organization",
        choices=list(AVAILABLE_PARSERS.keys()),
        help="Organization identifier"
    )
    parser.add_argument(
        "-o", "--output-json",
        help="Path to save parsed JSON data",
        default=None
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate extraction without saving"
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="Print parsed JSON to console"
    )

    args = parser.parse_args()

    try:
        paystubs = parse_paystub(
            args.pdf_path,
            args.organization,
            args.output_json,
            args.validate_only
        )

        if args.print:
            print("\n" + "="*60)
            print("PARSED DATA")
            print("="*60)
            print(json.dumps(paystubs, indent=2))

        sys.exit(0)

    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
