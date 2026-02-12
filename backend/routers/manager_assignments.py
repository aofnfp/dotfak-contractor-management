"""
Manager assignments router - link managers to contractor assignments.
"""

from datetime import date

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin, verify_token, get_manager_id
from backend.services.enrichment_service import enrich_manager_assignments
from backend.schemas import (
    ManagerAssignmentCreate,
    ManagerAssignmentUpdate,
    EndManagerAssignmentRequest,
    ManagerAssignmentResponse,
)

VALID_END_REASONS = {"transferred", "end_of_contract", "laid_off", "termination"}
from backend.services.manager_earnings_service import calculate_manager_earnings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manager-assignments", tags=["manager-assignments"])


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

        return enrich_manager_assignments(result.data or [])

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
        should_backfill = assignment_data.pop("backfill", False)

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

        created = result.data[0]
        logger.info(f"Manager assignment created: {created['id']}")

        # Backfill: calculate manager earnings for all historical paystubs
        if should_backfill:
            contractor_assignment_id = created["contractor_assignment_id"]
            start_date = created["start_date"]

            query = supabase_admin_client.table("paystubs").select("id").eq(
                "contractor_assignment_id", contractor_assignment_id
            ).gte("pay_period_begin", start_date).order("pay_period_begin")

            paystubs_result = query.execute()
            backfill_count = 0

            for ps in (paystubs_result.data or []):
                earnings = calculate_manager_earnings(ps["id"])
                if earnings:
                    backfill_count += len(earnings)

            logger.info(
                f"Backfilled {backfill_count} manager earnings records for "
                f"manager_assignment={created['id']}, paystubs={len(paystubs_result.data or [])}"
            )

        return enrich_manager_assignments([created])[0]

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


@router.post("/{assignment_id}/end")
async def end_manager_assignment(
    assignment_id: str,
    request: EndManagerAssignmentRequest,
    user: dict = Depends(require_admin)
):
    """End a manager assignment with a reason (admin only)."""
    try:
        if request.end_reason not in VALID_END_REASONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"end_reason must be one of: {sorted(VALID_END_REASONS)}"
            )

        current = supabase_admin_client.table("manager_assignments").select("*").eq(
            "id", assignment_id
        ).execute()

        if not current.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager assignment not found")

        if not current.data[0]["is_active"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager assignment is already ended")

        end_date = request.end_date or str(date.today())

        result = supabase_admin_client.table("manager_assignments").update({
            "is_active": False,
            "end_date": end_date,
            "end_reason": request.end_reason,
            "end_notes": request.end_notes,
        }).eq("id", assignment_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to end manager assignment")

        logger.info(f"Manager assignment ended: {assignment_id}, reason={request.end_reason}")
        return enrich_manager_assignments([result.data[0]])[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end manager assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end manager assignment: {str(e)}"
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
        return enrich_manager_assignments([result.data[0]])[0]

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
