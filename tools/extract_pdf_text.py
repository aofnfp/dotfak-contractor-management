#!/usr/bin/env python3
"""
Extract text content from PDF files for paystub parsing.

This tool converts PDF files to plain text, preserving layout and spacing
for regex-based extraction.
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)


def extract_text_from_pdf(pdf_path: str, output_path: Optional[str] = None) -> str:
    """
    Extract text from PDF file using pdfplumber.

    Args:
        pdf_path: Path to the PDF file
        output_path: Optional path to save extracted text

    Returns:
        Extracted text as string

    Raises:
        FileNotFoundError: If PDF file doesn't exist
        Exception: If PDF extraction fails
    """
    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    if not pdf_file.suffix.lower() == '.pdf':
        raise ValueError(f"File is not a PDF: {pdf_path}")

    try:
        all_text = []

        with pdfplumber.open(pdf_path) as pdf:
            print(f"Processing PDF with {len(pdf.pages)} pages...")

            for page_num, page in enumerate(pdf.pages, 1):
                print(f"  Extracting page {page_num}...")
                text = page.extract_text()

                if text:
                    all_text.append(f"{'='*80}")
                    all_text.append(f"PAGE {page_num}")
                    all_text.append(f"{'='*80}")
                    all_text.append(text)
                    all_text.append("")  # Blank line between pages
                else:
                    print(f"  WARNING: No text found on page {page_num}")

        extracted_text = "\n".join(all_text)

        # Save to file if output path specified
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(extracted_text, encoding='utf-8')
            print(f"\nText saved to: {output_path}")

        print(f"\nExtracted {len(extracted_text)} characters from {len(pdf.pages)} pages")
        return extracted_text

    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Extract text from PDF paystub files"
    )
    parser.add_argument(
        "pdf_path",
        help="Path to the PDF file to extract text from"
    )
    parser.add_argument(
        "-o", "--output",
        help="Path to save extracted text (optional)",
        default=None
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="Print extracted text to console"
    )

    args = parser.parse_args()

    try:
        text = extract_text_from_pdf(args.pdf_path, args.output)

        if args.print:
            print("\n" + "="*80)
            print("EXTRACTED TEXT")
            print("="*80)
            print(text)

        sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
