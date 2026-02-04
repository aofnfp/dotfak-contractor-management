#!/usr/bin/env python3
"""
Test script for complete paystub processing flow.
Tests upload → parse → match → calculate earnings → save.
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


def get_sample_paystub_path():
    """Get path to sample paystub."""
    sample_dir = project_root / "SampleData"
    # Find first PDF in SampleData
    pdf_files = list(sample_dir.glob("*.pdf"))

    if not pdf_files:
        print("❌ No sample PDFs found in SampleData/")
        return None

    return pdf_files[0]


def test_upload_paystub(token):
    """Test uploading a paystub with auto-matching and earnings calculation."""
    print("\n" + "="*60)
    print("TEST: Upload Paystub with Auto-Earnings Calculation")
    print("="*60)

    # Get sample paystub
    pdf_path = get_sample_paystub_path()
    if not pdf_path:
        return None

    print(f"   Using sample: {pdf_path.name}")

    # Upload paystub
    with open(pdf_path, 'rb') as f:
        files = {'file': (pdf_path.name, f, 'application/pdf')}
        data = {'organization': 'ap_account_services'}
        headers = {'Authorization': f'Bearer {token}'}

        response = requests.post(
            f"{BASE_URL}/paystubs/upload",
            files=files,
            data=data,
            headers=headers
        )

    if response.status_code == 201:
        result = response.json()
        print(f"✅ Paystub uploaded successfully")

        paystub = result['paystub']
        print(f"\n📄 Paystub Details:")
        print(f"   ID: {paystub['id']}")
        print(f"   Employee: {paystub['employee_name']} (ID: {paystub['employee_id']})")
        print(f"   Pay Period: {paystub['pay_period']}")
        print(f"   Gross Pay: ${paystub['gross_pay']}")
        print(f"   Contractor Match: {'✅ Yes' if paystub['matched_contractor'] else '❌ No'}")

        if 'earnings' in result:
            earnings = result['earnings']
            print(f"\n💰 Earnings Calculated:")
            print(f"   Contractor Total: ${earnings['contractor_total']}")
            print(f"   - Regular: ${earnings['regular_earnings']}")
            print(f"   - Bonus Share: ${earnings['bonus_share']}")
            print(f"   Company Margin: ${earnings['company_margin']}")
            print(f"   Payment Status: {earnings['payment_status']}")
            print(f"   Amount Pending: ${earnings['amount_pending']}")

            return {
                'paystub_id': paystub['id'],
                'earnings_id': earnings['id']
            }
        elif 'earnings_error' in result:
            print(f"\n⚠️  Earnings calculation failed: {result['earnings_error']}")
            return {'paystub_id': paystub['id']}
        else:
            print(f"\n⚠️  {result.get('message', 'No earnings calculated')}")
            return {'paystub_id': paystub['id']}

    elif response.status_code == 409:
        print(f"⚠️  Duplicate: {response.json()['detail']}")
        return None
    else:
        print(f"❌ Upload failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_duplicate_upload(token):
    """Test that duplicate uploads are rejected."""
    print("\n" + "="*60)
    print("TEST: Duplicate Upload Detection")
    print("="*60)

    pdf_path = get_sample_paystub_path()
    if not pdf_path:
        return

    with open(pdf_path, 'rb') as f:
        files = {'file': (pdf_path.name, f, 'application/pdf')}
        data = {'organization': 'ap_account_services'}
        headers = {'Authorization': f'Bearer {token}'}

        response = requests.post(
            f"{BASE_URL}/paystubs/upload",
            files=files,
            data=data,
            headers=headers
        )

    if response.status_code == 409:
        print(f"✅ Duplicate correctly rejected")
        print(f"   Message: {response.json()['detail']}")
    else:
        print(f"❌ Expected 409 Conflict, got {response.status_code}")


def verify_database_state():
    """Verify data was saved correctly to database."""
    print("\n" + "="*60)
    print("TEST: Verify Database State")
    print("="*60)

    # Check paystubs
    paystubs = supabase_admin_client.table("paystubs").select("*").execute()
    print(f"✅ Paystubs in database: {len(paystubs.data)}")

    if paystubs.data:
        latest = paystubs.data[0]
        print(f"   Latest: {latest['employee_name']} - ${latest['gross_pay']}")

    # Check earnings
    earnings = supabase_admin_client.table("contractor_earnings").select("*").execute()
    print(f"✅ Earnings records: {len(earnings.data)}")

    if earnings.data:
        latest = earnings.data[0]
        print(f"   Latest: ${latest['contractor_total_earnings']} pending")


def cleanup_test_data():
    """Clean up test paystubs (optional)."""
    print("\n" + "="*60)
    print("Cleanup (optional)")
    print("="*60)

    response = input("Delete test paystubs? (y/N): ")

    if response.lower() == 'y':
        # Get test paystubs
        paystubs = supabase_admin_client.table("paystubs").select("id").execute()

        for paystub in paystubs.data:
            # Delete earnings first (foreign key)
            supabase_admin_client.table("contractor_earnings").delete().eq(
                "paystub_id", paystub['id']
            ).execute()

            # Delete paystub
            supabase_admin_client.table("paystubs").delete().eq(
                "id", paystub['id']
            ).execute()

        print(f"✅ Deleted {len(paystubs.data)} paystub(s)")


if __name__ == "__main__":
    print("=" * 60)
    print("Paystub Processing Flow Test")
    print("=" * 60)

    # Get admin token
    token = get_admin_token()
    if not token:
        print("\n❌ Failed to get admin token. Exiting.")
        sys.exit(1)

    # Test upload with earnings calculation
    result = test_upload_paystub(token)

    # Test duplicate detection
    if result:
        test_duplicate_upload(token)

    # Verify database state
    verify_database_state()

    # Optional cleanup
    cleanup_test_data()

    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
