#!/usr/bin/env python3
"""
Authentication router - handles user signup and login via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
import logging

from backend.config import supabase_client, supabase_admin_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


# Request/Response Models
class SignupRequest(BaseModel):
    """User signup request."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = Field(default="contractor", description="User role: admin or contractor")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123!",
                "first_name": "John",
                "last_name": "Doe",
                "role": "contractor"
            }
        }


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123!"
            }
        }


class AuthResponse(BaseModel):
    """Authentication response with JWT token."""
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None
    session: Optional[Dict[str, Any]] = None


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    """
    Create a new user account.

    This endpoint:
    1. Creates a Supabase auth user with email/password
    2. Sets user metadata (role, first_name, last_name)
    3. Returns the access token for immediate login

    Args:
        request: Signup request with email, password, and optional user info

    Returns:
        AuthResponse with user info and JWT token

    Raises:
        HTTPException: If signup fails (e.g., email already exists)
    """
    try:
        # Create user in Supabase Auth
        auth_response = supabase_client.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "role": request.role,
                    "first_name": request.first_name,
                    "last_name": request.last_name
                }
            }
        })

        # Check if signup was successful
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user. Email may already be registered."
            )

        logger.info(f"User created successfully: {request.email} (role: {request.role})")

        return AuthResponse(
            success=True,
            message="User created successfully. Please check your email for verification (if enabled).",
            user={
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "role": request.role,
                "first_name": request.first_name,
                "last_name": request.last_name
            },
            session={
                "access_token": auth_response.session.access_token if auth_response.session else None,
                "refresh_token": auth_response.session.refresh_token if auth_response.session else None,
                "expires_at": auth_response.session.expires_at if auth_response.session else None
            } if auth_response.session else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup failed for {request.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login with email and password.

    This endpoint:
    1. Authenticates user with Supabase
    2. Returns JWT access token and refresh token
    3. Token should be sent in Authorization header for protected endpoints

    Args:
        request: Login request with email and password

    Returns:
        AuthResponse with user info and JWT tokens

    Raises:
        HTTPException: If login fails (invalid credentials)
    """
    try:
        # Authenticate with Supabase
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Extract role from user metadata
        role = auth_response.user.user_metadata.get("role", "contractor")
        first_name = auth_response.user.user_metadata.get("first_name")
        last_name = auth_response.user.user_metadata.get("last_name")

        logger.info(f"User logged in: {request.email} (role: {role})")

        return AuthResponse(
            success=True,
            message="Login successful",
            user={
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "role": role,
                "first_name": first_name,
                "last_name": last_name
            },
            session={
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "expires_at": auth_response.session.expires_at,
                "token_type": "Bearer"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed for {request.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.post("/logout")
async def logout():
    """
    Logout the current user.

    Note: Since we're using JWT tokens, logout is primarily handled client-side
    by deleting the token. This endpoint is here for consistency and can be used
    to invalidate sessions on the server side if needed in the future.

    Returns:
        Success message
    """
    try:
        # Supabase sign out (invalidates refresh token)
        supabase_client.auth.sign_out()

        return {
            "success": True,
            "message": "Logged out successfully"
        }

    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.

    When the access token expires, use this endpoint with the refresh token
    to get a new access token without requiring the user to log in again.

    Args:
        refresh_token: Refresh token from login response

    Returns:
        New access token and refresh token

    Raises:
        HTTPException: If refresh token is invalid or expired
    """
    try:
        # Refresh session with Supabase
        auth_response = supabase_client.auth.refresh_session(refresh_token)

        if not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        return {
            "success": True,
            "message": "Token refreshed successfully",
            "session": {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "expires_at": auth_response.session.expires_at,
                "token_type": "Bearer"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh token"
        )


@router.get("/me")
async def get_current_user_info():
    """
    Get current user information.

    Protected endpoint - requires valid JWT token in Authorization header.
    Use this to verify token validity and get user details.

    Returns:
        Current user information

    Note: This endpoint will be protected by the verify_token dependency
    when integrated into main.py
    """
    # This endpoint needs to be protected with verify_token dependency
    # For now, return a placeholder response
    return {
        "message": "This endpoint requires authentication. "
                   "Add Depends(verify_token) to protect this route."
    }
