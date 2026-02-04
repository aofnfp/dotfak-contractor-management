#!/usr/bin/env python3
"""
Test script to verify Supabase client database operations.
Uses Supabase REST API instead of direct PostgreSQL connection.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_admin_client

def test_supabase_client():
    """Test Supabase client database operations."""
    try:
        print("=" * 60)
        print("Testing Supabase Client (REST API)")
        print("=" * 60)

        print("\n🔌 Testing Supabase client connection...")

        # Test 1: Query client companies
        print("\n🏢 Client companies:")
        result = supabase_admin_client.table("client_companies").select("*").execute()

        if result.data:
            for company in result.data:
                status = "✅ Active" if company['is_active'] else "❌ Inactive"
                print(f"   • {company['name']} ({company['code']}) - {status}")
        else:
            print("   No companies found")

        # Test 2: Query contractors
        print("\n👷 Contractors:")
        result = supabase_admin_client.table("contractors").select("*").limit(10).execute()

        if result.data:
            for contractor in result.data:
                status = "✅ Active" if contractor['is_active'] else "❌ Inactive"
                print(f"   • {contractor['contractor_code']}: {contractor['first_name']} {contractor['last_name']} - {status}")
        else:
            print("   No contractors yet (expected at this stage)")

        # Test 3: Query paystubs
        print("\n📄 Paystubs:")
        result = supabase_admin_client.table("paystubs").select("*", count="exact").execute()
        print(f"   Total paystubs: {result.count if result.count else 0}")

        # Test 4: Query contractor assignments
        print("\n📝 Contractor assignments:")
        result = supabase_admin_client.table("contractor_assignments").select("*").execute()
        print(f"   Total assignments: {len(result.data) if result.data else 0}")

        print("\n" + "=" * 60)
        print("✅ All Supabase client tests passed!")
        print("=" * 60)

        print("\n💡 Note:")
        print("   Supabase REST API is working correctly.")
        print("   Direct PostgreSQL connections may require:")
        print("   - Connection pooling (Supavisor)")
        print("   - Or use Supabase client for all database operations")

        return True

    except Exception as e:
        print(f"\n❌ Supabase client test failed: {str(e)}")
        print("\nPlease verify:")
        print("1. SUPABASE_URL is correct in .env")
        print("2. SUPABASE_SERVICE_KEY is correct in .env")
        print("3. Tables exist in database")
        return False

if __name__ == "__main__":
    test_supabase_client()
