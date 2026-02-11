"""
Devices router - CRUD for device registry (laptops, routers, etc.).

Admin and managers can create/update devices.
Managers can only see devices for their own assignments.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
import logging

from backend.config import supabase_admin_client
from backend.dependencies import verify_token, get_manager_id
from backend.schemas import DeviceCreate, DeviceUpdate, DeviceResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/devices", tags=["devices"])


def _enrich_device(device: dict) -> dict:
    """Add contractor_name, client_name, manager_name to device."""
    enriched = dict(device)

    # Contractor + client from contractor_assignment
    if device.get("contractor_assignment_id"):
        ca = supabase_admin_client.table("contractor_assignments").select(
            "contractor_id, client_company_id"
        ).eq("id", device["contractor_assignment_id"]).execute()

        if ca.data:
            contractor = supabase_admin_client.table("contractors").select(
                "first_name, last_name"
            ).eq("id", ca.data[0]["contractor_id"]).execute()
            if contractor.data:
                c = contractor.data[0]
                enriched["contractor_name"] = f"{c['first_name']} {c['last_name']}"

            client = supabase_admin_client.table("client_companies").select(
                "name"
            ).eq("id", ca.data[0]["client_company_id"]).execute()
            if client.data:
                enriched["client_name"] = client.data[0]["name"]

    # Manager name from manager_assignment
    if device.get("manager_assignment_id"):
        ma = supabase_admin_client.table("manager_assignments").select(
            "manager_id"
        ).eq("id", device["manager_assignment_id"]).execute()

        if ma.data:
            mgr = supabase_admin_client.table("managers").select(
                "first_name, last_name"
            ).eq("id", ma.data[0]["manager_id"]).execute()
            if mgr.data:
                enriched["manager_name"] = f"{mgr.data[0]['first_name']} {mgr.data[0]['last_name']}"

    return enriched


@router.get("")
async def list_devices(
    status_filter: Optional[str] = None,
    contractor_assignment_id: Optional[str] = None,
    manager_assignment_id: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """
    List devices.
    - Admin: all devices
    - Manager: devices for their assignments only
    """
    try:
        role = user.get("role")

        query = supabase_admin_client.table("devices").select("*")

        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if not own_manager_id:
                return []
            # Get manager's assignment IDs
            ma_result = supabase_admin_client.table("manager_assignments").select(
                "id"
            ).eq("manager_id", own_manager_id).eq("is_active", True).execute()
            ma_ids = [ma["id"] for ma in (ma_result.data or [])]
            if not ma_ids:
                return []
            query = query.in_("manager_assignment_id", ma_ids)
        elif role != "admin":
            return []

        if status_filter:
            query = query.eq("status", status_filter)
        if contractor_assignment_id:
            query = query.eq("contractor_assignment_id", contractor_assignment_id)
        if manager_assignment_id:
            query = query.eq("manager_assignment_id", manager_assignment_id)

        result = query.order("created_at", desc=True).execute()

        return [_enrich_device(d) for d in (result.data or [])]

    except Exception as e:
        logger.error(f"Failed to list devices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve devices: {str(e)}"
        )


@router.get("/{device_id}")
async def get_device(
    device_id: str,
    user: dict = Depends(verify_token)
):
    """Get device detail."""
    try:
        result = supabase_admin_client.table("devices").select("*").eq("id", device_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        device = result.data[0]
        role = user.get("role")

        # Manager can only view their own assignment's devices
        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            ma_result = supabase_admin_client.table("manager_assignments").select(
                "id"
            ).eq("manager_id", own_manager_id).eq("id", device.get("manager_assignment_id")).execute()
            if not ma_result.data:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        elif role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        return _enrich_device(device)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get device: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve device: {str(e)}"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_device(
    device: DeviceCreate,
    user: dict = Depends(verify_token)
):
    """Create a device (admin or manager for their assignments)."""
    try:
        role = user.get("role")

        # Manager can only create devices for their own assignments
        if role == "manager":
            own_manager_id = get_manager_id(user["user_id"])
            if device.manager_assignment_id:
                ma_result = supabase_admin_client.table("manager_assignments").select(
                    "id"
                ).eq("manager_id", own_manager_id).eq("id", device.manager_assignment_id).execute()
                if not ma_result.data:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="manager_assignment_id required for managers")
        elif role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        device_data = device.model_dump()
        # Convert dates to strings
        for date_field in ["received_date", "delivered_date"]:
            if device_data.get(date_field):
                device_data[date_field] = str(device_data[date_field])

        result = supabase_admin_client.table("devices").insert(device_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create device"
            )

        logger.info(f"Device created: {result.data[0]['id']}")
        return _enrich_device(result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create device: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create device: {str(e)}"
        )


@router.put("/{device_id}")
async def update_device(
    device_id: str,
    device_update: DeviceUpdate,
    user: dict = Depends(verify_token)
):
    """Update a device (admin or manager for their assignments)."""
    try:
        role = user.get("role")

        # Check access
        if role == "manager":
            device_result = supabase_admin_client.table("devices").select(
                "manager_assignment_id"
            ).eq("id", device_id).execute()
            if not device_result.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

            own_manager_id = get_manager_id(user["user_id"])
            ma_result = supabase_admin_client.table("manager_assignments").select(
                "id"
            ).eq("manager_id", own_manager_id).eq("id", device_result.data[0].get("manager_assignment_id")).execute()
            if not ma_result.data:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
        elif role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        update_data = device_update.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        # Convert dates to strings
        for date_field in ["received_date", "delivered_date", "returned_date"]:
            if date_field in update_data and update_data[date_field]:
                update_data[date_field] = str(update_data[date_field])

        result = supabase_admin_client.table("devices").update(update_data).eq("id", device_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        logger.info(f"Device updated: {device_id}")
        return _enrich_device(result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update device: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update device: {str(e)}"
        )


@router.put("/{device_id}/status")
async def update_device_status(
    device_id: str,
    new_status: str,
    user: dict = Depends(verify_token)
):
    """Change device status (admin or manager)."""
    try:
        valid_statuses = ["received", "delivered", "in_use", "returned", "lost"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )

        role = user.get("role")

        # Check access for managers
        if role == "manager":
            device_result = supabase_admin_client.table("devices").select(
                "manager_assignment_id"
            ).eq("id", device_id).execute()
            if not device_result.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

            own_manager_id = get_manager_id(user["user_id"])
            ma_result = supabase_admin_client.table("manager_assignments").select(
                "id"
            ).eq("manager_id", own_manager_id).eq("id", device_result.data[0].get("manager_assignment_id")).execute()
            if not ma_result.data:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
        elif role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        update_data = {"status": new_status}

        # Auto-set date fields based on status
        from datetime import date
        today = str(date.today())
        if new_status == "delivered":
            update_data["delivered_date"] = today
        elif new_status == "returned":
            update_data["returned_date"] = today

        result = supabase_admin_client.table("devices").update(update_data).eq("id", device_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        logger.info(f"Device {device_id} status changed to {new_status}")
        return _enrich_device(result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update device status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update device status: {str(e)}"
        )
