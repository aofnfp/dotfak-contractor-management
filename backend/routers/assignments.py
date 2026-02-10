#!/usr/bin/env python3
"""
Contractor assignment router - manage contractor-client assignments with rate structures.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging

from backend.config import supabase_admin_client, supabase_client
from backend.dependencies import require_admin, verify_token, get_contractor_id
from backend.schemas import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentWithDetails,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assignments", tags=["assignments"])


def validate_rate_structure(rate_type: str, fixed_hourly_rate: Optional[float], percentage_rate: Optional[float]):
    """
    Validate rate structure: must be fixed XOR percentage (not both, not neither).

    Args:
        rate_type: 'fixed' or 'percentage'
        fixed_hourly_rate: Fixed hourly rate
        percentage_rate: Percentage rate

    Raises:
        HTTPException: If rate structure is invalid
    """
    if rate_type not in ["fixed", "percentage"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rate_type must be 'fixed' or 'percentage'"
        )

    if rate_type == "fixed":
        if fixed_hourly_rate is None or fixed_hourly_rate <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="fixed_hourly_rate is required and must be > 0 for fixed rate type"
            )
        if percentage_rate is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="percentage_rate must be null for fixed rate type"
            )

    elif rate_type == "percentage":
        if percentage_rate is None or percentage_rate <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="percentage_rate is required and must be > 0 for percentage rate type"
            )
        if fixed_hourly_rate is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="fixed_hourly_rate must be null for percentage rate type"
            )


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment: AssignmentCreate,
    user: dict = Depends(require_admin)
):
    """
    Create a new contractor assignment (admin only).

    Assigns a contractor to a client company with a rate structure.

    Args:
        assignment: Assignment data
        user: Current user (admin)

    Returns:
        Created assignment details
    """
    try:
        # Validate rate structure
        validate_rate_structure(
            assignment.rate_type,
            assignment.fixed_hourly_rate,
            assignment.percentage_rate
        )

        # Verify contractor exists
        contractor = supabase_admin_client.table("contractors").select("id").eq(
            "id", str(assignment.contractor_id)
        ).execute()

        if not contractor.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contractor not found"
            )

        # Verify client company exists
        client = supabase_admin_client.table("client_companies").select("id").eq(
            "id", str(assignment.client_company_id)
        ).execute()

        if not client.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client company not found"
            )

        # Create assignment
        assignment_data = assignment.model_dump()
        assignment_data["contractor_id"] = str(assignment.contractor_id)
        assignment_data["client_company_id"] = str(assignment.client_company_id)

        result = supabase_admin_client.table("contractor_assignments").insert(assignment_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create assignment"
            )

        logger.info(f"Assignment created: {result.data[0]['id']}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create assignment: {str(e)}"
        )


@router.get("", response_model=List[AssignmentWithDetails])
async def list_assignments(
    contractor_id: Optional[str] = None,
    client_company_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    """
    List assignments.

    - Admin: sees all assignments (can filter by contractor or client)
    - Contractor: sees only their own assignments

    Args:
        contractor_id: Filter by contractor UUID
        client_company_id: Filter by client UUID
        is_active: Filter by active status
        limit: Maximum number of results
        user: Current user

    Returns:
        List of assignments
    """
    try:
        role = user.get("role")

        # Build query
        if role == "admin":
            query = supabase_admin_client.table("contractor_assignments").select("*")

            if contractor_id:
                query = query.eq("contractor_id", contractor_id)

            if client_company_id:
                query = query.eq("client_company_id", client_company_id)

        else:
            # Contractor sees only their own assignments
            own_contractor_id = get_contractor_id(user["user_id"])

            if not own_contractor_id:
                return []

            query = supabase_client.table("contractor_assignments").select("*").eq(
                "contractor_id", own_contractor_id
            )

        if is_active is not None:
            query = query.eq("is_active", is_active)

        result = query.order("created_at", desc=True).limit(limit).execute()

        # Fetch and join contractor and client details for each assignment
        assignments = result.data if result.data else []
        for assignment in assignments:
            # Fetch contractor details
            contractor = supabase_admin_client.table("contractors").select(
                "first_name, last_name, contractor_code"
            ).eq("id", assignment["contractor_id"]).execute()

            # Fetch client details
            client = supabase_admin_client.table("client_companies").select(
                "name, code"
            ).eq("id", assignment["client_company_id"]).execute()

            # Add joined data
            if contractor.data:
                c = contractor.data[0]
                assignment["contractor_name"] = f"{c['first_name']} {c['last_name']}"
                assignment["contractor_code"] = c["contractor_code"]

            if client.data:
                cl = client.data[0]
                assignment["client_name"] = cl["name"]
                assignment["client_code"] = cl["code"]

        return assignments

    except Exception as e:
        logger.error(f"Failed to list assignments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve assignments: {str(e)}"
        )


@router.get("/{assignment_id}", response_model=AssignmentWithDetails)
async def get_assignment(
    assignment_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get assignment details by ID.

    - Admin: can view any assignment
    - Contractor: can only view their own assignments

    Args:
        assignment_id: Assignment UUID
        user: Current user

    Returns:
        Assignment details
    """
    try:
        # Fetch assignment
        result = supabase_admin_client.table("contractor_assignments").select("*").eq(
            "id", assignment_id
        ).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )

        assignment = result.data[0]

        # Check authorization for contractors
        if user.get("role") != "admin":
            own_contractor_id = get_contractor_id(user["user_id"])
            if str(assignment["contractor_id"]) != str(own_contractor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own assignments"
                )

        # Fetch contractor details
        contractor = supabase_admin_client.table("contractors").select(
            "first_name, last_name, contractor_code"
        ).eq("id", assignment["contractor_id"]).execute()

        # Fetch client details
        client = supabase_admin_client.table("client_companies").select(
            "name, code"
        ).eq("id", assignment["client_company_id"]).execute()

        # Add joined data
        if contractor.data:
            c = contractor.data[0]
            assignment["contractor_name"] = f"{c['first_name']} {c['last_name']}"
            assignment["contractor_code"] = c["contractor_code"]

        if client.data:
            cl = client.data[0]
            assignment["client_name"] = cl["name"]
            assignment["client_code"] = cl["code"]

        return assignment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve assignment: {str(e)}"
        )


@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    assignment_update: AssignmentUpdate,
    user: dict = Depends(require_admin)
):
    """
    Update assignment (admin only).

    Args:
        assignment_id: Assignment UUID
        assignment_update: Updated assignment data
        user: Current user (admin)

    Returns:
        Updated assignment details
    """
    try:
        # Build update data
        update_data = assignment_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # If rate structure is being updated, validate it
        if "rate_type" in update_data or "fixed_hourly_rate" in update_data or "percentage_rate" in update_data:
            # Fetch current assignment to get current values
            current = supabase_admin_client.table("contractor_assignments").select("*").eq(
                "id", assignment_id
            ).execute()

            if not current.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assignment not found"
                )

            current_assignment = current.data[0]

            # Merge current and update values
            rate_type = update_data.get("rate_type", current_assignment["rate_type"])
            fixed_hourly_rate = update_data.get("fixed_hourly_rate", current_assignment["fixed_hourly_rate"])
            percentage_rate = update_data.get("percentage_rate", current_assignment["percentage_rate"])

            validate_rate_structure(rate_type, fixed_hourly_rate, percentage_rate)

        # Capture old values for amendment detection
        old_assignment = None
        if any(f in update_data for f in ("rate_type", "fixed_hourly_rate", "percentage_rate", "bonus_split_percentage")):
            old_query = supabase_admin_client.table("contractor_assignments").select("*").eq(
                "id", assignment_id
            ).execute()
            if old_query.data:
                old_assignment = old_query.data[0]

        # Update assignment
        result = supabase_admin_client.table("contractor_assignments").update(update_data).eq(
            "id", assignment_id
        ).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )

        # Auto-generate contract amendment if material terms changed
        if old_assignment:
            try:
                from backend.services.contract_service import ContractService
                changes = ContractService.detect_material_changes(old_assignment, result.data[0])
                if changes:
                    existing = supabase_admin_client.table("contracts").select("id").eq(
                        "assignment_id", assignment_id
                    ).eq("status", "fully_executed").order("version", desc=True).limit(1).execute()

                    if existing.data:
                        ContractService.generate_amendment(
                            parent_contract_id=existing.data[0]["id"],
                            assignment_id=assignment_id,
                            changes=changes,
                        )
                        logger.info(f"Amendment auto-generated for assignment {assignment_id}")
            except Exception as e:
                logger.warning(f"Failed to auto-generate amendment: {e}")

        logger.info(f"Assignment updated: {assignment_id}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update assignment: {str(e)}"
        )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    user: dict = Depends(require_admin)
):
    """
    Delete assignment (admin only).

    This performs a soft delete by setting is_active to false.

    Args:
        assignment_id: Assignment UUID
        user: Current user (admin)

    Returns:
        204 No Content
    """
    try:
        # Soft delete
        result = supabase_admin_client.table("contractor_assignments").update({
            "is_active": False
        }).eq("id", assignment_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )

        logger.info(f"Assignment deactivated: {assignment_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete assignment: {str(e)}"
        )
