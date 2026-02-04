#!/usr/bin/env python3
"""
FastAPI dependencies for authentication and authorization.

Provides middleware functions for:
- Verifying Supabase JWT tokens
- Extracting user information from tokens
- Role-based access control (admin vs contractor)
"""

from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)

# Security scheme for API documentation
security = HTTPBearer()


async def verify_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and extract user information.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        Dict containing user information (user_id, email, role, etc.)

    Raises:
        HTTPException: If token is missing, invalid, or expired
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from "Bearer <token>" format
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme. Use 'Bearer <token>'",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify JWT token using Supabase client
    try:
        from backend.config import supabase_client

        # Use Supabase's built-in token verification
        response = supabase_client.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = response.user

        # Extract user information
        user_id = user.id
        email = user.email
        role = user.user_metadata.get("role", "contractor")

        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "user_metadata": user.user_metadata
        }

    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Get current authenticated user.

    This is a dependency that can be used in route handlers.
    It depends on verify_token to extract user information from JWT.

    Args:
        token_data: Token data from verify_token dependency

    Returns:
        Dict containing user information
    """
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return token_data


async def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Require admin role.

    This dependency verifies the token AND checks that the user has admin role.
    Use this for admin-only endpoints.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        Dict containing admin user information

    Raises:
        HTTPException: If user is not an admin
    """
    user = await verify_token(authorization)

    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


async def require_contractor(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Require contractor role (or admin).

    This dependency verifies the token AND checks that the user has contractor role
    (or admin, since admins can access contractor endpoints for testing).

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        Dict containing contractor user information

    Raises:
        HTTPException: If user is not a contractor or admin
    """
    user = await verify_token(authorization)

    role = user.get("role")
    if role not in ["contractor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contractor access required",
        )

    return user


def get_contractor_id(user_id: str) -> Optional[str]:
    """
    Get contractor ID from auth user ID.

    Looks up the contractor record linked to the auth user.

    Args:
        user_id: Supabase auth user ID (UUID)

    Returns:
        Contractor ID (UUID) or None if not found
    """
    try:
        result = supabase_admin_client.table("contractors").select("id").eq("auth_user_id", user_id).single().execute()
        return result.data.get("id") if result.data else None
    except Exception as e:
        logger.error(f"Failed to get contractor ID for user {user_id}: {str(e)}")
        return None
