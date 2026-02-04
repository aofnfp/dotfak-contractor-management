#!/usr/bin/env python3
"""
Save parsed paystub data to PostgreSQL database.

This tool saves JSON paystub data to the database, extracting
key fields for efficient querying while storing complete data in JSONB.
"""

import argparse
import json
import sys
import os
from typing import Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


def save_paystub(paystub: Dict[str, Any], connection_string: str = None) -> int:
    """
    Save single paystub to database.

    Args:
        paystub: Paystub dictionary (from parse_paystub.py)
        connection_string: PostgreSQL connection string

    Returns:
        Database record ID

    Raises:
        ValueError: If required fields missing
        Exception: If database operation fails
    """
    if not connection_string:
        connection_string = os.getenv('DATABASE_URL')

    if not connection_string:
        raise ValueError(
            "No database connection string provided. "
            "Set DATABASE_URL in .env or pass via --connection-string"
        )

    # Extract key fields
    employee_id = paystub.get("header", {}).get("employee", {}).get("id")
    employee_name = paystub.get("header", {}).get("employee", {}).get("name")
    organization = paystub.get("metadata", {}).get("organization")
    pay_period_begin = paystub.get("header", {}).get("pay_period", {}).get("begin")
    pay_period_end = paystub.get("header", {}).get("pay_period", {}).get("end")
    check_date = paystub.get("header", {}).get("check_date")
    net_pay = paystub.get("summary", {}).get("current", {}).get("net_pay")
    gross_pay = paystub.get("summary", {}).get("current", {}).get("gross_pay")

    # Validate required fields
    if not employee_name:
        raise ValueError("Missing employee name")
    if not pay_period_begin or not pay_period_end:
        raise ValueError("Missing pay period dates")
    if not organization:
        raise ValueError("Missing organization")

    # Default employee_id if not present
    if not employee_id:
        employee_id = "UNKNOWN"

    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()

        # Insert or update (upsert)
        query = """
            INSERT INTO paystubs (
                employee_id, employee_name, organization,
                pay_period_begin, pay_period_end, check_date,
                net_pay, gross_pay, paystub_data
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (employee_id, pay_period_begin, pay_period_end, organization)
            DO UPDATE SET
                employee_name = EXCLUDED.employee_name,
                check_date = EXCLUDED.check_date,
                net_pay = EXCLUDED.net_pay,
                gross_pay = EXCLUDED.gross_pay,
                paystub_data = EXCLUDED.paystub_data,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """

        cursor.execute(query, (
            employee_id,
            employee_name,
            organization,
            pay_period_begin,
            pay_period_end,
            check_date,
            net_pay,
            gross_pay,
            Json(paystub)  # Store complete JSON
        ))

        record_id = cursor.fetchone()[0]

        conn.commit()
        cursor.close()
        conn.close()

        return record_id

    except Exception as e:
        raise Exception(f"Failed to save paystub: {str(e)}")


def save_paystubs_from_file(json_file: str, connection_string: str = None) -> List[int]:
    """
    Save multiple paystubs from JSON file.

    Args:
        json_file: Path to JSON file with paystub data
        connection_string: PostgreSQL connection string

    Returns:
        List of database record IDs
    """
    print(f"Loading paystubs from: {json_file}")

    with open(json_file, 'r', encoding='utf-8') as f:
        paystubs = json.load(f)

    if not isinstance(paystubs, list):
        paystubs = [paystubs]

    print(f"Found {len(paystubs)} paystub(s)")
    print("\nSaving to database...")

    record_ids = []

    for idx, paystub in enumerate(paystubs, 1):
        try:
            employee_name = paystub.get("header", {}).get("employee", {}).get("name", "Unknown")
            pay_period = paystub.get("header", {}).get("pay_period", {})
            period_str = f"{pay_period.get('begin')} to {pay_period.get('end')}"

            print(f"  [{idx}/{len(paystubs)}] {employee_name} ({period_str})...", end=" ")

            record_id = save_paystub(paystub, connection_string)
            record_ids.append(record_id)

            print(f"✓ Saved (ID: {record_id})")

        except Exception as e:
            print(f"✗ Failed: {e}")
            continue

    print(f"\n✓ Saved {len(record_ids)}/{len(paystubs)} paystub(s)")
    return record_ids


def main():
    """Main execution function."""
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Save parsed paystub data to PostgreSQL database"
    )
    parser.add_argument(
        "json_file",
        help="Path to JSON file with parsed paystub data"
    )
    parser.add_argument(
        "--connection-string",
        help="PostgreSQL connection string (or set DATABASE_URL in .env)",
        default=None
    )

    args = parser.parse_args()

    try:
        record_ids = save_paystubs_from_file(args.json_file, args.connection_string)
        print(f"\nSUCCESS: Saved {len(record_ids)} record(s)")
        sys.exit(0)

    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
