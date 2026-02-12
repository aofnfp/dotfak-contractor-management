#!/usr/bin/env python3
"""
Contractor management router - CRUD operations for contractors.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client, supabase_client
from backend.dependencies import require_admin, verify_token, get_contractor_id
from backend.schemas import (
    ContractorCreate,
    ContractorUpdate,
    ContractorResponse,
    ContractorListItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contractors", tags=["contractors"])


@router.post("", response_model=ContractorResponse, status_code=status.HTTP_201_CREATED)
async def create_contractor(
    contractor: ContractorCreate,
    user: dict = Depends(require_admin)
):
    """
    Create a new contractor (admin only).

    This endpoint:
    1. Optionally creates a Supabase auth user (if email/password provided)
    2. Creates a contractor record linked to the auth user
    3. Returns the contractor details

    Args:
        contractor: Contractor data
        user: Current user (admin)

    Returns:
        Created contractor details
    """
    try:
        auth_user_id = None

        # Step 1: Create auth user if email provided
        if contractor.email and contractor.password:
            logger.info(f"Creating auth user for contractor: {contractor.email}")

            auth_response = supabase_admin_client.auth.admin.create_user({
                "email": contractor.email,
                "password": contractor.password,
                "email_confirm": True,  # Auto-confirm email
                "user_metadata": {
                    "role": "contractor",
                    "first_name": contractor.first_name,
                    "last_name": contractor.last_name
                }
            })

            if auth_response.user:
                auth_user_id = auth_response.user.id
                logger.info(f"Auth user created: {auth_user_id}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create auth user"
                )

        # Step 2: Generate contractor code if not provided
        contractor_code = contractor.contractor_code
        if not contractor_code:
            # Query for the highest existing contractor code
            result = supabase_admin_client.table("contractors").select("contractor_code").like("contractor_code", "DTK-%").order("contractor_code", desc=True).limit(1).execute()

            if result.data and len(result.data) > 0:
                # Extract number from DTK-XXX and increment
                last_code = result.data[0]["contractor_code"]
                try:
                    last_number = int(last_code.split("-")[1])
                    next_number = last_number + 1
                except (IndexError, ValueError):
                    next_number = 1
            else:
                next_number = 1

            contractor_code = f"DTK-{next_number:03d}"
            logger.info(f"Auto-generated contractor code: {contractor_code}")

        # Step 3: Create contractor record
        contractor_data = {
            "auth_user_id": str(auth_user_id) if auth_user_id else None,
            "contractor_code": contractor_code,
            "first_name": contractor.first_name,
            "last_name": contractor.last_name,
            "phone": contractor.phone,
            "address": contractor.address,
            "ssn_last_4": contractor.ssn_last_4,
            "notes": contractor.notes,
            "is_active": contractor.is_active,
        }

        result = supabase_admin_client.table("contractors").insert(contractor_data).execute()

        if not result.data:
            # Rollback: delete auth user if contractor creation failed
            if auth_user_id:
                supabase_admin_client.auth.admin.delete_user(auth_user_id)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create contractor record"
            )

        logger.info(f"Contractor created: {result.data[0]['id']}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create contractor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create contractor: {str(e)}"
        )


@router.get("", response_model=List[ContractorListItem])
async def list_contractors(
    is_active: Optional[bool] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List contractors.

    - Admin: sees all contractors
    - Contractor: sees only themselves

    Args:
        is_active: Filter by active status
        limit: Maximum number of results
        user: Current user

    Returns:
        List of contractors
    """
    try:
        # Check user role
        role = user.get("role")

        if role == "admin":
            # Admin sees all contractors
            query = supabase_admin_client.table("contractors").select(
                "id, contractor_code, first_name, last_name, phone, is_active, created_at"
            )

            if is_active is not None:
                query = query.eq("is_active", is_active)

            result = query.order("created_at", desc=True).limit(limit).execute()

        else:
            # Contractor sees only themselves
            contractor_id = get_contractor_id(user["user_id"])

            if not contractor_id:
                return []

            result = supabase_client.table("contractors").select(
                "id, contractor_code, first_name, last_name, phone, is_active, created_at"
            ).eq("id", contractor_id).execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Failed to list contractors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve contractors: {str(e)}"
        )


@router.get("/{contractor_id}", response_model=ContractorResponse)
async def get_contractor(
    contractor_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get contractor details by ID.

    - Admin: can view any contractor
    - Contractor: can only view themselves

    Args:
        contractor_id: Contractor UUID
        user: Current user

    Returns:
        Contractor details
    """
    try:
        role = user.get("role")

        # Check authorization
        if role != "admin":
            # Contractor can only view themselves
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(contractor_id) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own profile"
                )

        # Fetch contractor
        result = supabase_admin_client.table("contractors").select("*").eq("id", contractor_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get contractor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve contractor: {str(e)}"
        )


@router.put("/{contractor_id}", response_model=ContractorResponse)
async def update_contractor(
    contractor_id: str,
    contractor_update: ContractorUpdate,
    user: dict = Depends(verify_token)
):
    """
    Update contractor profile.

    - Admin: can update any contractor
    - Contractor: can only update themselves (limited fields)

    Args:
        contractor_id: Contractor UUID
        contractor_update: Updated contractor data
        user: Current user

    Returns:
        Updated contractor details
    """
    try:
        role = user.get("role")

        # Check authorization
        if role != "admin":
            # Contractor can only update themselves
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(contractor_id) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own profile"
                )

            # Contractors cannot change is_active status
            if contractor_update.is_active is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot change your active status"
                )

        # Build update data (only include non-None fields)
        update_data = contractor_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Update contractor
        result = supabase_admin_client.table("contractors").update(update_data).eq("id", contractor_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        logger.info(f"Contractor updated: {contractor_id}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update contractor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update contractor: {str(e)}"
        )


@router.post("/{contractor_id}/activate", response_model=ContractorResponse)
async def activate_contractor(
    contractor_id: str,
    user: dict = Depends(require_admin)
):
    """Reactivate a deactivated contractor (admin only)."""
    try:
        result = supabase_admin_client.table("contractors").update({
            "is_active": True
        }).eq("id", contractor_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        logger.info(f"Contractor reactivated: {contractor_id}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reactivate contractor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reactivate contractor: {str(e)}"
        )


@router.delete("/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contractor(
    contractor_id: str,
    user: dict = Depends(require_admin)
):
    """
    Delete contractor (admin only).

    This performs a soft delete by setting is_active to false.
    The contractor record is preserved for audit purposes.

    Args:
        contractor_id: Contractor UUID
        user: Current user (admin)

    Returns:
        204 No Content
    """
    try:
        # Soft delete: set is_active to false
        result = supabase_admin_client.table("contractors").update({
            "is_active": False
        }).eq("id", contractor_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        logger.info(f"Contractor deactivated: {contractor_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete contractor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete contractor: {str(e)}"
        )
