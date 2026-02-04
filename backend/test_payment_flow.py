#!/usr/bin/env python3
"""
Test script for payment recording and allocation flow.
Tests: record payment → allocate to earnings (FIFO) → update status → view summary.
"""

import sys
from pathlib import Path
import requests

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_admin_client

BASE_URL = "http://localhost:8000"


def get_admin_token():
    """Get admin token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testuser@gmail.com", "password": "TestPass123!"}
    )

    if response.status_code == 200:
        token = response.json()['session']['access_token']
        print("✅ Logged in as admin")
        return token
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def get_contractor_with_unpaid_earnings():
    """Find a contractor with unpaid earnings."""
    try:
        # Get earnings that are unpaid
        earnings = supabase_admin_client.table("contractor_earnings").select(
            "*, contractor_assignments(contractor_id, contractors(contractor_code, first_name, last_name))"
        ).in_("payment_status", ["unpaid", "partially_paid"]).limit(1).execute()

        if earnings.data:
            earning = earnings.data[0]
            contractor_info = earning['contractor_assignments']['contractors']
            return {
                'contractor_id': earning['contractor_assignments']['contractor_id'],
                'contractor_name': f"{contractor_info['first_name']} {contractor_info['last_name']}",
                'contractor_code': contractor_info['contractor_code'],
                'earning_id': earning['id'],
                'amount_pending': earning['amount_pending']
            }

        return None

    except Exception as e:
        print(f"Error finding contractor: {e}")
        return None


def test_view_earnings(token, contractor_id):
    """Test viewing earnings."""
    print("\n" + "="*60)
    print("TEST: View Contractor Earnings")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/earnings?contractor_id={contractor_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        earnings = response.json()
        print(f"✅ Retrieved {len(earnings)} earning record(s)")

        for earning in earnings:
            print(f"\n   Earning ID: {earning['id']}")
            print(f"   Period: {earning['pay_period_begin']} to {earning['pay_period_end']}")
            print(f"   Total: ${earning['contractor_total_earnings']}")
            print(f"   Status: {earning['payment_status']}")
            print(f"   Paid: ${earning['amount_paid']}")
            print(f"   Pending: ${earning['amount_pending']}")

        return earnings
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return []


def test_earnings_summary(token, contractor_id):
    """Test earnings summary."""
    print("\n" + "="*60)
    print("TEST: Earnings Summary")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/payments/contractor/{contractor_id}/summary",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        summary = response.json()
        print(f"✅ Summary retrieved")
        print(f"   Total Earned: ${summary['total_earned']}")
        print(f"   Total Paid: ${summary['total_paid']}")
        print(f"   Total Pending: ${summary['total_pending']}")
        print(f"   Earnings Count: {summary['earnings_count']}")

        if summary.get('oldest_unpaid_date'):
            print(f"   Oldest Unpaid: {summary['oldest_unpaid_date']}")

        return summary
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return None


def test_record_payment(token, contractor_id, amount):
    """Test recording a payment with FIFO allocation."""
    print("\n" + "="*60)
    print("TEST: Record Payment (FIFO Allocation)")
    print("="*60)

    payment_data = {
        "contractor_id": contractor_id,
        "amount": amount,
        "payment_method": "direct_deposit",
        "payment_date": "2025-02-15",
        "transaction_reference": "TEST-TXN-001",
        "notes": "Test payment via API"
    }

    response = requests.post(
        f"{BASE_URL}/payments",
        json=payment_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 201:
        payment = response.json()
        print(f"✅ Payment recorded successfully")
        print(f"\n💵 Payment Details:")
        print(f"   ID: {payment['id']}")
        print(f"   Amount: ${payment['amount']}")
        print(f"   Method: {payment['payment_method']}")
        print(f"   Date: {payment['payment_date']}")

        if 'allocations' in payment and payment['allocations']:
            print(f"\n📊 Allocations (FIFO):")
            for alloc in payment['allocations']:
                print(f"   • Earning {alloc['earning_id']}: ${alloc['amount_allocated']}")

        return payment
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_view_payments(token, contractor_id):
    """Test viewing payment history."""
    print("\n" + "="*60)
    print("TEST: View Payment History")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/payments?contractor_id={contractor_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        payments = response.json()
        print(f"✅ Retrieved {len(payments)} payment(s)")

        for payment in payments:
            print(f"\n   Payment ID: {payment['id']}")
            print(f"   Amount: ${payment['amount']}")
            print(f"   Method: {payment.get('payment_method', 'N/A')}")
            print(f"   Date: {payment['payment_date']}")

        return payments
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return []


def test_partial_payment(token, contractor_id, partial_amount):
    """Test partial payment (should result in partially_paid status)."""
    print("\n" + "="*60)
    print("TEST: Partial Payment")
    print("="*60)

    payment_data = {
        "contractor_id": contractor_id,
        "amount": partial_amount,
        "payment_method": "check",
        "payment_date": "2025-02-16",
        "transaction_reference": "CHECK-1001"
    }

    response = requests.post(
        f"{BASE_URL}/payments",
        json=payment_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 201:
        payment = response.json()
        print(f"✅ Partial payment recorded: ${partial_amount}")

        if 'allocations' in payment:
            print(f"   Allocated to {len(payment['allocations'])} earning(s)")

        return payment
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("Payment Flow Test")
    print("=" * 60)

    # Get admin token
    token = get_admin_token()
    if not token:
        print("\n❌ Failed to get admin token. Exiting.")
        sys.exit(1)

    # Find contractor with unpaid earnings
    contractor_info = get_contractor_with_unpaid_earnings()

    if not contractor_info:
        print("\n⚠️  No contractors with unpaid earnings found.")
        print("   Run test_paystub_flow.py first to create earnings.")
        sys.exit(0)

    contractor_id = contractor_info['contractor_id']
    print(f"\n📋 Testing with: {contractor_info['contractor_name']} ({contractor_info['contractor_code']})")
    print(f"   Amount pending: ${contractor_info['amount_pending']}")

    # Test 1: View earnings before payment
    print("\n" + "=" * 60)
    print("BEFORE PAYMENT")
    print("=" * 60)
    earnings_before = test_view_earnings(token, contractor_id)
    summary_before = test_earnings_summary(token, contractor_id)

    # Test 2: Record payment (FIFO allocation)
    if summary_before and summary_before['total_pending'] > 0:
        payment_amount = min(200.00, summary_before['total_pending'])  # Pay up to $200
        test_record_payment(token, contractor_id, payment_amount)

    # Test 3: View earnings after payment
    print("\n" + "=" * 60)
    print("AFTER PAYMENT")
    print("=" * 60)
    earnings_after = test_view_earnings(token, contractor_id)
    summary_after = test_earnings_summary(token, contractor_id)

    # Test 4: View payment history
    test_view_payments(token, contractor_id)

    # Test 5: Partial payment (if there's still pending amount)
    if summary_after and summary_after['total_pending'] > 0:
        partial_amount = min(50.00, summary_after['total_pending'])
        test_partial_payment(token, contractor_id, partial_amount)

        # Final state
        print("\n" + "=" * 60)
        print("FINAL STATE")
        print("=" * 60)
        test_view_earnings(token, contractor_id)
        test_earnings_summary(token, contractor_id)

    print("\n" + "=" * 60)
    print("✅ All payment tests completed!")
    print("=" * 60)

    # Summary of changes
    if summary_before and summary_after:
        print("\n📊 Summary of Changes:")
        print(f"   Pending: ${summary_before['total_pending']} → ${summary_after['total_pending']}")
        print(f"   Paid: ${summary_before['total_paid']} → ${summary_after['total_paid']}")
        reduction = summary_before['total_pending'] - summary_after['total_pending']
        print(f"   ✅ Reduced pending by: ${reduction}")
