#!/usr/bin/env python3
"""
Backfill paystub_account_splits for paystubs whose payment_info was parsed
but never run through BankAccountService at upload time.

Root cause: /paystubs/upload did not call BankAccountService.check_paystub_accounts
inside the per-paystub loop, so only paystubs the UI later opened got their
bank splits + payment status synced.

Usage:
    python tools/backfill_paystub_account_splits.py            # preview
    python tools/backfill_paystub_account_splits.py --apply    # do it
"""

import argparse
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_admin_client
from backend.services import BankAccountService


def find_affected_paystubs():
    """Return paystubs where payment_info has accounts but splits are missing or partial."""
    paystubs = supabase_admin_client.table("paystubs").select(
        "id, employee_name, pay_period_begin, pay_period_end, paystub_data"
    ).order("id").execute().data or []

    affected = []
    for p in paystubs:
        payment_info = ((p.get("paystub_data") or {}).get("payment_info")) or []
        accounts_with_number = [a for a in payment_info if a.get("account_number")]
        if not accounts_with_number:
            continue

        splits = supabase_admin_client.table("paystub_account_splits").select(
            "id"
        ).eq("paystub_id", p["id"]).execute().data or []

        if len(splits) < len(accounts_with_number):
            affected.append({
                "id": p["id"],
                "employee_name": p.get("employee_name"),
                "period": f"{p.get('pay_period_begin')} → {p.get('pay_period_end')}",
                "expected_splits": len(accounts_with_number),
                "actual_splits": len(splits),
            })
    return affected


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true",
                        help="Actually run the backfill (default is dry-run preview)")
    args = parser.parse_args()

    affected = find_affected_paystubs()

    print(f"\nAffected paystubs: {len(affected)}\n")
    if not affected:
        print("Nothing to do.")
        return

    for row in affected:
        print(f"  paystub {row['id']:>4}  {row['employee_name']:<25}  "
              f"{row['period']}  splits {row['actual_splits']}/{row['expected_splits']}")

    if not args.apply:
        print("\n(dry-run) re-run with --apply to backfill.")
        return

    print(f"\nApplying to {len(affected)} paystubs...\n")
    fixed = 0
    failed = 0
    still_unassigned = 0
    for row in affected:
        pid = row["id"]
        try:
            result = BankAccountService.check_paystub_accounts(pid)
            BankAccountService.sync_earnings_payment_status(pid)
            if result.needs_assignment:
                still_unassigned += 1
                print(f"  paystub {pid:>4}  ⚠ {len(result.unassigned_accounts)} new account(s) need manual assignment")
            else:
                fixed += 1
                print(f"  paystub {pid:>4}  ✓ matched {result.assigned_accounts} account(s)")
        except Exception as e:
            failed += 1
            print(f"  paystub {pid:>4}  ✗ failed: {e}")

    print(f"\nDone. fixed={fixed}, still_unassigned={still_unassigned}, failed={failed}")


if __name__ == "__main__":
    main()
