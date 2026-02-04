#!/usr/bin/env python3
"""
Test script to verify Supabase authentication setup.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import supabase_admin_client

def confirm_user_email(email: str):
    """
    Manually confirm a user's email using admin client.

    This is useful for testing when email confirmation is enabled in Supabase.
    """
    try:
        # Get user by email
        result = supabase_admin_client.auth.admin.list_users()

        users = [u for u in result if u.email == email]

        if not users:
            print(f"❌ User with email {email} not found")
            return False

        user = users[0]
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        print(f"   Email confirmed: {user.email_confirmed_at}")
        print(f"   Role: {user.user_metadata.get('role', 'N/A')}")

        # If email not confirmed, confirm it
        if not user.email_confirmed_at:
            print("   Confirming email...")
            # Update user to mark email as confirmed
            supabase_admin_client.auth.admin.update_user_by_id(
                user.id,
                {"email_confirm": True}
            )
            print("✅ Email confirmed successfully!")

        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_login(email: str, password: str):
    """Test login with email and password."""
    try:
        print(f"\n🔐 Testing login for {email}...")

        from backend.config import supabase_client

        response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if response.user:
            print(f"✅ Login successful!")
            print(f"   User ID: {response.user.id}")
            print(f"   Email: {response.user.email}")
            print(f"   Role: {response.user.user_metadata.get('role', 'N/A')}")
            print(f"   Access token (first 50 chars): {response.session.access_token[:50]}...")
            return True
        else:
            print(f"❌ Login failed - no user returned")
            return False

    except Exception as e:
        print(f"❌ Login failed: {str(e)}")
        return False


def list_all_users():
    """List all users in Supabase Auth."""
    try:
        print("\n📋 Listing all users...")
        result = supabase_admin_client.auth.admin.list_users()

        if not result:
            print("No users found")
            return

        for user in result:
            print(f"\n  • {user.email}")
            print(f"    ID: {user.id}")
            print(f"    Role: {user.user_metadata.get('role', 'N/A')}")
            print(f"    Email confirmed: {'Yes' if user.email_confirmed_at else 'No'}")
            print(f"    Created: {user.created_at}")

    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")


if __name__ == "__main__":
    print("=" * 60)
    print("Supabase Authentication Test")
    print("=" * 60)

    # List all users
    list_all_users()

    # Confirm test user
    print("\n" + "=" * 60)
    test_email = "testuser@gmail.com"
    test_password = "TestPass123!"

    if confirm_user_email(test_email):
        # Test login
        test_login(test_email, test_password)

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)
