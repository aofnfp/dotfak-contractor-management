"""
Manager management router - CRUD operations for managers.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_manager_id
from backend.schemas import (
    ManagerCreate,
    ManagerUpdate,
    ManagerResponse,
    ManagerListItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/managers", tags=["managers"])


@router.post("", response_model=ManagerResponse, status_code=status.HTTP_201_CREATED)
async def create_manager(
    manager: ManagerCreate,
    user: dict = Depends(require_admin)
):
    """Create a new manager (admin only)."""
    try:
        manager_data = {
            "first_name": manager.first_name,
            "last_name": manager.last_name,
            "email": manager.email,
            "phone": manager.phone,
            "address": manager.address,
            "city": manager.city,
            "state": manager.state,
            "country": manager.country,
            "zip_code": manager.zip_code,
            "notes": manager.notes,
            "is_active": manager.is_active,
        }

        result = supabase_admin_client.table("managers").insert(manager_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create manager record"
            )

        logger.info(f"Manager created: {result.data[0]['id']}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create manager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create manager: {str(e)}"
        )


@router.get("")
async def list_managers(
    is_active: Optional[bool] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List managers.
    - Admin: sees all managers with managed_count
    - Manager: sees only themselves
    """
    try:
        role = user.get("role")

        if role == "admin":
            query = supabase_admin_client.table("managers").select(
                "id, first_name, last_name, email, phone, onboarding_status, is_active, created_at"
            )

            if is_active is not None:
                query = query.eq("is_active", is_active)

            result = query.order("created_at", desc=True).limit(limit).execute()

            # Enrich with managed_count
            managers = []
            for m in (result.data or []):
                count_result = supabase_admin_client.table("manager_assignments").select(
                    "id", count="exact"
                ).eq("manager_id", m["id"]).eq("is_active", True).execute()
                m["managed_count"] = count_result.count if count_result.count is not None else 0
                managers.append(m)

            return managers

        elif role == "manager":
            manager_id = get_manager_id(user["user_id"])
            if not manager_id:
                return []

            result = supabase_admin_client.table("managers").select(
                "id, first_name, last_name, email, phone, onboarding_status, is_active, created_at"
            ).eq("id", manager_id).execute()

            return result.data if result.data else []

        else:
            return []

    except Exception as e:
        logger.error(f"Failed to list managers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve managers: {str(e)}"
        )


@router.get("/{manager_id}", response_model=ManagerResponse)
async def get_manager(
    manager_id: str,
    user: dict = Depends(verify_token)
):
    """Get manager details by ID (admin or self)."""
    try:
        role = user.get("role")

        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if str(manager_id) != str(own_manager_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own profile"
                )
        elif role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        result = supabase_admin_client.table("managers").select("*").eq("id", manager_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found"
            )

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get manager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve manager: {str(e)}"
        )


@router.put("/{manager_id}", response_model=ManagerResponse)
async def update_manager(
    manager_id: str,
    manager_update: ManagerUpdate,
    user: dict = Depends(require_admin)
):
    """Update manager profile (admin only)."""
    try:
        update_data = manager_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        result = supabase_admin_client.table("managers").update(update_data).eq("id", manager_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found"
            )

        logger.info(f"Manager updated: {manager_id}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update manager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update manager: {str(e)}"
        )


@router.post("/{manager_id}/activate", response_model=ManagerResponse)
async def activate_manager(
    manager_id: str,
    user: dict = Depends(require_admin)
):
    """Reactivate a deactivated manager (admin only)."""
    try:
        result = supabase_admin_client.table("managers").update({
            "is_active": True
        }).eq("id", manager_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found"
            )

        logger.info(f"Manager reactivated: {manager_id}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reactivate manager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reactivate manager: {str(e)}"
        )


@router.delete("/{manager_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manager(
    manager_id: str,
    user: dict = Depends(require_admin)
):
    """Soft-delete manager (admin only)."""
    try:
        result = supabase_admin_client.table("managers").update({
            "is_active": False
        }).eq("id", manager_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found"
            )

        logger.info(f"Manager deactivated: {manager_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete manager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete manager: {str(e)}"
        )
