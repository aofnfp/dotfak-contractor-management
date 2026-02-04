#!/usr/bin/env python3
"""
Configuration for the Paystub Extractor API.

Loads environment variables and provides access to Supabase configuration.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))

# Frontend URL (for CORS)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Validate required environment variables
if not all([SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, DATABASE_URL]):
    raise ValueError(
        "Missing required environment variables. "
        "Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, "
        "and DATABASE_URL are set in .env file."
    )


# Supabase Client Factory Functions
def get_supabase_client() -> Client:
    """
    Get a Supabase client with anon key (for public operations).

    Use this for operations that respect Row Level Security (RLS) policies.
    The anon key is safe to expose to the frontend.
    """
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """
    Get a Supabase client with service role key (admin access).

    CAUTION: This bypasses Row Level Security (RLS) policies.
    Only use for admin operations or when you need to bypass RLS.
    NEVER expose service_role key to frontend.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# Export for convenience
supabase_client = get_supabase_client()
supabase_admin_client = get_supabase_admin_client()
