#!/usr/bin/env python3
"""
Test script for contractor and assignment endpoints.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_admin_client
import requests
import json

BASE_URL = "http://localhost:8000"


def get_admin_token():
    """Get admin token by logging in with testuser (temporarily made admin)."""
    # First, make testuser an admin temporarily
    try:
        result = supabase_admin_client.auth.admin.list_users()
        users = [u for u in result if u.email == "testuser@gmail.com"]

        if users:
            user = users[0]
            # Update user to admin role
            supabase_admin_client.auth.admin.update_user_by_id(
                user.id,
                {"user_metadata": {"role": "admin", "first_name": "Test", "last_name": "User"}}
            )
            print("✅ Updated testuser to admin role")
    except Exception as e:
        print(f"⚠️  Could not update user role: {e}")

    # Login
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testuser@gmail.com", "password": "TestPass123!"}
    )

    if response.status_code == 200:
        data = response.json()
        token = data.get("session", {}).get("access_token")
        print(f"✅ Logged in as admin")
        return token
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def test_create_contractor(token):
    """Test creating a contractor."""
    print("\n" + "="*60)
    print("TEST: Create Contractor")
    print("="*60)

    contractor_data = {
        "contractor_code": "CONT-001",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1-555-0100",
        "address": "123 Main St, City, State 12345",
        "ssn_last_4": "1234",
        "notes": "Test contractor",
        "is_active": True,
        "email": "john.doe@example.com",
        "password": "Contractor123!"
    }

    response = requests.post(
        f"{BASE_URL}/contractors",
        json=contractor_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 201:
        data = response.json()
        print(f"✅ Contractor created successfully")
        print(f"   ID: {data['id']}")
        print(f"   Code: {data['contractor_code']}")
        print(f"   Name: {data['first_name']} {data['last_name']}")
        return data['id']
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_list_contractors(token):
    """Test listing contractors."""
    print("\n" + "="*60)
    print("TEST: List Contractors")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/contractors",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved {len(data)} contractor(s)")
        for contractor in data:
            print(f"   • {contractor['contractor_code']}: {contractor['first_name']} {contractor['last_name']}")
        return data
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return []


def test_get_contractor(token, contractor_id):
    """Test getting contractor details."""
    print("\n" + "="*60)
    print("TEST: Get Contractor Details")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/contractors/{contractor_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved contractor details")
        print(f"   Code: {data['contractor_code']}")
        print(f"   Name: {data['first_name']} {data['last_name']}")
        print(f"   Phone: {data['phone']}")
        print(f"   Active: {data['is_active']}")
        return data
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_create_assignment(token, contractor_id):
    """Test creating an assignment."""
    print("\n" + "="*60)
    print("TEST: Create Assignment")
    print("="*60)

    # Get AP Account Services client company ID
    result = supabase_admin_client.table("client_companies").select("id").eq(
        "code", "ap_account_services"
    ).execute()

    if not result.data:
        print("❌ AP Account Services not found in database")
        return None

    client_id = result.data[0]["id"]
    print(f"   Using client: AP Account Services ({client_id})")

    assignment_data = {
        "contractor_id": contractor_id,
        "client_company_id": client_id,
        "client_employee_id": "000074267",  # Example employee ID
        "rate_type": "fixed",
        "fixed_hourly_rate": 4.00,
        "percentage_rate": None,
        "bonus_split_percentage": 50.00,
        "start_date": "2025-01-01",
        "end_date": None,
        "notes": "Test assignment"
    }

    response = requests.post(
        f"{BASE_URL}/assignments",
        json=assignment_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 201:
        data = response.json()
        print(f"✅ Assignment created successfully")
        print(f"   ID: {data['id']}")
        print(f"   Rate: ${data['fixed_hourly_rate']}/hr (fixed)")
        print(f"   Bonus split: {data['bonus_split_percentage']}%")
        return data['id']
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_list_assignments(token, contractor_id):
    """Test listing assignments."""
    print("\n" + "="*60)
    print("TEST: List Assignments")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/assignments?contractor_id={contractor_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved {len(data)} assignment(s)")
        for assignment in data:
            rate_info = f"${assignment['fixed_hourly_rate']}/hr" if assignment['rate_type'] == 'fixed' else f"{assignment['percentage_rate']}%"
            print(f"   • Rate: {rate_info}, Bonus split: {assignment['bonus_split_percentage']}%")
        return data
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   {response.text}")
        return []


if __name__ == "__main__":
    print("=" * 60)
    print("Contractor & Assignment Endpoints Test")
    print("=" * 60)

    # Get admin token
    token = get_admin_token()
    if not token:
        print("\n❌ Failed to get admin token. Exiting.")
        sys.exit(1)

    # Test contractor endpoints
    contractor_id = test_create_contractor(token)

    if contractor_id:
        test_list_contractors(token)
        test_get_contractor(token, contractor_id)

        # Test assignment endpoints
        assignment_id = test_create_assignment(token, contractor_id)

        if assignment_id:
            test_list_assignments(token, contractor_id)

    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
