#!/usr/bin/env python3
"""
Client companies router - simple read-only endpoints for listing clients.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import logging

from backend.config import supabase_admin_client
from backend.dependencies import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[dict])
async def list_clients(
    user: dict = Depends(require_admin)
):
    """
    List all client companies.

    Args:
        user: Current user

    Returns:
        List of client companies
    """
    try:
        result = supabase_admin_client.table("client_companies").select("*").order("name").execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Failed to list clients: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve clients: {str(e)}"
        )


@router.get("/{client_id}", response_model=dict)
async def get_client(
    client_id: str,
    user: dict = Depends(require_admin)
):
    """
    Get client company by ID.

    Args:
        client_id: Client company UUID
        user: Current user

    Returns:
        Client company details
    """
    try:
        result = supabase_admin_client.table("client_companies").select("*").eq("id", client_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client company not found"
            )

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get client: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve client: {str(e)}"
        )
