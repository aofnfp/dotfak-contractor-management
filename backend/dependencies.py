#!/usr/bin/env python3
"""
FastAPI dependencies for authentication and authorization.

Provides middleware functions for:
- Verifying Supabase JWT tokens
- Extracting user information from tokens
- Role-based access control (admin vs contractor)
"""

from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)

# Security scheme for API documentation
security = HTTPBearer()


async def verify_token(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_impersonate_user: Optional[str] = Header(None, alias="X-Impersonate-User"),
) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and extract user information.

    Impersonation: when an admin sends `X-Impersonate-User: <auth_user_id>` on
    a GET request, the returned identity is swapped to the target user. Only
    GETs can be impersonated — destructive actions are never executed under
    a swapped identity. The original admin's id and email are preserved on
    the returned dict (`_impersonated_by_id`, `_impersonated_by_email`) so
    audit logs can attribute correctly.

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

        identity = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "user_metadata": user.user_metadata,
        }

        # Optional impersonation — admin only, GET only.
        if x_impersonate_user:
            if role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins may impersonate other users",
                )
            if request.method != "GET":
                # Don't silently allow writes under a swapped identity.
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Impersonation is read-only — exit impersonation to perform this action",
                )

            target = supabase_admin_client.auth.admin.get_user_by_id(x_impersonate_user)
            target_user = getattr(target, "user", None)
            if not target_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Impersonation target not found",
                )

            target_role = target_user.user_metadata.get("role", "contractor")
            return {
                "user_id": target_user.id,
                "email": target_user.email,
                "role": target_role,
                "user_metadata": target_user.user_metadata,
                "_impersonated_by_id": user_id,
                "_impersonated_by_email": email,
            }

        return identity

    except HTTPException:
        raise
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


async def require_admin(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_impersonate_user: Optional[str] = Header(None, alias="X-Impersonate-User"),
) -> Dict[str, Any]:
    """
    Require admin role.

    This dependency verifies the token AND checks that the user has admin role.
    Use this for admin-only endpoints.

    Note: while impersonating, an admin's effective role is swapped to the
    target user's role, so admin-only endpoints will reject impersonated
    requests — which is the intended safety behavior.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        Dict containing admin user information

    Raises:
        HTTPException: If user is not an admin
    """
    user = await verify_token(request, authorization, x_impersonate_user)

    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


async def require_contractor(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_impersonate_user: Optional[str] = Header(None, alias="X-Impersonate-User"),
) -> Dict[str, Any]:
    """
    Require contractor role (or admin).
    """
    user = await verify_token(request, authorization, x_impersonate_user)

    role = user.get("role")
    if role not in ["contractor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contractor access required",
        )

    return user


async def require_manager(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_impersonate_user: Optional[str] = Header(None, alias="X-Impersonate-User"),
) -> Dict[str, Any]:
    """
    Require manager role (or admin).
    """
    user = await verify_token(request, authorization, x_impersonate_user)

    role = user.get("role")
    if role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required",
        )

    return user


def get_manager_id(user_id: str) -> Optional[str]:
    """
    Get manager ID from auth user ID.
    """
    try:
        result = supabase_admin_client.table("managers").select("id").eq("auth_user_id", user_id).single().execute()
        return result.data.get("id") if result.data else None
    except Exception as e:
        logger.error(f"Failed to get manager ID for user {user_id}: {str(e)}")
        return None


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
