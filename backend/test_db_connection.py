#!/usr/bin/env python3
"""
Test script to verify database connection.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import psycopg2
from backend.config import DATABASE_URL

def test_connection():
    """Test PostgreSQL connection."""
    try:
        print("=" * 60)
        print("Testing Database Connection")
        print("=" * 60)

        print("\n🔌 Connecting to Supabase PostgreSQL...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("✅ Connection successful!\n")

        # Test 1: List all tables
        print("📋 Tables in database:")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()
        for table in tables:
            print(f"   • {table[0]}")

        # Test 2: Check client companies
        print("\n🏢 Client companies:")
        cursor.execute("SELECT name, code, is_active FROM client_companies;")
        companies = cursor.fetchall()

        if companies:
            for name, code, is_active in companies:
                status = "✅ Active" if is_active else "❌ Inactive"
                print(f"   • {name} ({code}) - {status}")
        else:
            print("   No companies found")

        # Test 3: Check contractors
        print("\n👷 Contractors:")
        cursor.execute("""
            SELECT contractor_code, first_name, last_name, is_active
            FROM contractors
            LIMIT 10;
        """)
        contractors = cursor.fetchall()

        if contractors:
            for code, first, last, is_active in contractors:
                status = "✅ Active" if is_active else "❌ Inactive"
                print(f"   • {code}: {first} {last} - {status}")
        else:
            print("   No contractors yet (expected at this stage)")

        # Test 4: Check paystubs
        print("\n📄 Paystubs:")
        cursor.execute("SELECT COUNT(*) FROM paystubs;")
        count = cursor.fetchone()[0]
        print(f"   Total paystubs: {count}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("✅ All database tests passed!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n❌ Database connection failed: {str(e)}")
        print("\nPlease verify:")
        print("1. DATABASE_URL is correct in .env")
        print("2. Database password is correct")
        print("3. Network connection is working")
        return False

if __name__ == "__main__":
    test_connection()
