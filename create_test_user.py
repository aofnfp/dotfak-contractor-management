#!/usr/bin/env python3
"""
Create test user in Supabase for frontend testing.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_client, supabase_admin_client

def create_test_user():
    """Create testuser@gmail.com with admin role."""

    email = "testuser@gmail.com"
    password = "TestPass123!"

    print(f"Creating user: {email}")

    try:
        # Sign up the user
        auth_response = supabase_client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": "admin",
                    "first_name": "Test",
                    "last_name": "User"
                }
            }
        })

        if auth_response.user:
            print(f"✅ User created: {email}")
            print(f"   User ID: {auth_response.user.id}")
            print(f"   Role: admin")
            print(f"\nYou can now log in with:")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
        else:
            print(f"❌ Failed to create user")

    except Exception as e:
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            print(f"✅ User already exists: {email}")
            print(f"\nYou can log in with:")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
        else:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_test_user()
