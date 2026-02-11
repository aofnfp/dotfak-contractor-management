"""
Manager assignments router - link managers to contractor assignments.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_manager_id
from backend.schemas import (
    ManagerAssignmentCreate,
    ManagerAssignmentUpdate,
    ManagerAssignmentResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manager-assignments", tags=["manager-assignments"])


def _enrich_assignment(assignment: dict) -> dict:
    """Add manager_name, contractor_name, client_name to assignment."""
    enriched = dict(assignment)

    # Manager name
    if assignment.get("manager_id"):
        mgr = supabase_admin_client.table("managers").select(
            "first_name, last_name"
        ).eq("id", assignment["manager_id"]).execute()
        if mgr.data:
            enriched["manager_name"] = f"{mgr.data[0]['first_name']} {mgr.data[0]['last_name']}"

    # Contractor + client from contractor_assignment
    if assignment.get("contractor_assignment_id"):
        ca = supabase_admin_client.table("contractor_assignments").select(
            "contractor_id, client_company_id"
        ).eq("id", assignment["contractor_assignment_id"]).execute()

        if ca.data:
            # Contractor name
            contractor = supabase_admin_client.table("contractors").select(
                "first_name, last_name, contractor_code"
            ).eq("id", ca.data[0]["contractor_id"]).execute()
            if contractor.data:
                c = contractor.data[0]
                enriched["contractor_name"] = f"{c['first_name']} {c['last_name']}"

            # Client name
            client = supabase_admin_client.table("client_companies").select(
                "name"
            ).eq("id", ca.data[0]["client_company_id"]).execute()
            if client.data:
                enriched["client_name"] = client.data[0]["name"]

    return enriched


@router.get("")
async def list_manager_assignments(
    manager_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: dict = Depends(verify_token)
):
    """
    List manager assignments.
    - Admin: all (optionally filter by manager_id)
    - Manager: own assignments only
    """
    try:
        role = user.get("role")

        query = supabase_admin_client.table("manager_assignments").select("*")

        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if not own_manager_id:
                return []
            query = query.eq("manager_id", own_manager_id)
        elif role == "admin":
            if manager_id:
                query = query.eq("manager_id", manager_id)
        else:
            return []

        if is_active is not None:
            query = query.eq("is_active", is_active)

        result = query.order("created_at", desc=True).execute()

        return [_enrich_assignment(a) for a in (result.data or [])]

    except Exception as e:
        logger.error(f"Failed to list manager assignments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve manager assignments: {str(e)}"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_manager_assignment(
    assignment: ManagerAssignmentCreate,
    user: dict = Depends(require_admin)
):
    """Create a manager assignment (admin only)."""
    try:
        assignment_data = assignment.model_dump()
        # Convert date to string for JSON serialization
        assignment_data["start_date"] = str(assignment_data["start_date"])
        if assignment_data.get("end_date"):
            assignment_data["end_date"] = str(assignment_data["end_date"])

        result = supabase_admin_client.table("manager_assignments").insert(assignment_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create manager assignment"
            )

        logger.info(f"Manager assignment created: {result.data[0]['id']}")
        return _enrich_assignment(result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This manager is already assigned to this contractor assignment"
            )
        logger.error(f"Failed to create manager assignment: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create manager assignment: {error_msg}"
        )


@router.put("/{assignment_id}")
async def update_manager_assignment(
    assignment_id: str,
    assignment_update: ManagerAssignmentUpdate,
    user: dict = Depends(require_admin)
):
    """Update a manager assignment (admin only)."""
    try:
        update_data = assignment_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Convert dates to strings
        if "start_date" in update_data and update_data["start_date"]:
            update_data["start_date"] = str(update_data["start_date"])
        if "end_date" in update_data and update_data["end_date"]:
            update_data["end_date"] = str(update_data["end_date"])

        result = supabase_admin_client.table("manager_assignments").update(
            update_data
        ).eq("id", assignment_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager assignment not found"
            )

        logger.info(f"Manager assignment updated: {assignment_id}")
        return _enrich_assignment(result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update manager assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update manager assignment: {str(e)}"
        )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manager_assignment(
    assignment_id: str,
    user: dict = Depends(require_admin)
):
    """Deactivate a manager assignment (admin only)."""
    try:
        result = supabase_admin_client.table("manager_assignments").update({
            "is_active": False
        }).eq("id", assignment_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager assignment not found"
            )

        logger.info(f"Manager assignment deactivated: {assignment_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete manager assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete manager assignment: {str(e)}"
        )
