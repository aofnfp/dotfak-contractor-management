#!/usr/bin/env python3
"""
Enhanced paystub router - upload with auto-matching and earnings calculation.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from typing import List, Optional
from pathlib import Path
import sys
import logging

# Add tools to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "tools"))

from extract_pdf_text import extract_text_from_pdf
from parsers import get_parser, AVAILABLE_PARSERS

from backend.config import supabase_admin_client
from backend.dependencies import require_admin
from backend.services import PaystubService, calculate_contractor_earnings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/paystubs", tags=["paystubs"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_paystub_with_earnings(
    file: UploadFile = File(...),
    organization: str = Form(...),
    user: dict = Depends(require_admin)
):
    """
    Upload paystub PDF with automatic contractor matching and earnings calculation (admin only).

    This endpoint:
    1. Validates and parses the PDF
    2. Checks for duplicates (SHA-256 hash)
    3. Auto-matches to contractor assignment (by employee_id)
    4. Calculates contractor earnings (fixed or percentage rate)
    5. Saves paystub and earnings to database

    Args:
        file: PDF file to upload
        organization: Organization identifier (e.g., 'ap_account_services')
        user: Current user (admin)

    Returns:
        Paystub and earnings details
    """
    try:
        # Validate organization
        if organization not in AVAILABLE_PARSERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Organization '{organization}' not supported. "
                       f"Available: {list(AVAILABLE_PARSERS.keys())}"
            )

        # Validate file type
        if not file.filename or not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a PDF"
            )

        # Read file content for hash calculation
        file_content = await file.read()

        # Calculate file hash for duplicate detection
        file_hash = PaystubService.calculate_file_hash(file_content)

        # Check for duplicates
        existing = PaystubService.check_duplicate(file_hash)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Paystub already uploaded (ID: {existing['id']})"
            )

        # Save file temporarily for processing
        tmp_dir = Path(__file__).parent.parent.parent / ".tmp"
        tmp_dir.mkdir(exist_ok=True)

        pdf_path = tmp_dir / file.filename
        with open(pdf_path, "wb") as f:
            f.write(file_content)

        # Extract text from PDF
        text = extract_text_from_pdf(str(pdf_path))

        # Parse with organization-specific parser
        parser_module = get_parser(organization)
        paystubs = parser_module.parse(text, file.filename)

        # Clean up temp file
        pdf_path.unlink()

        if not paystubs or len(paystubs) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to parse paystub - no data extracted"
            )

        # Process first paystub (should only be one per file)
        paystub_data = paystubs[0]

        # Get client company
        client_company = PaystubService.get_client_company_by_code(organization)
        if not client_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client company not found for organization: {organization}"
            )

        client_company_id = client_company['id']

        # Extract employee ID for auto-matching
        employee_id = paystub_data.get('header', {}).get('employee', {}).get('id')
        if not employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paystub missing employee ID - cannot auto-match"
            )

        pay_period_begin = paystub_data.get('header', {}).get('pay_period', {}).get('begin')
        if not pay_period_begin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paystub missing pay period - cannot process"
            )

        # Try to find contractor assignment
        assignment = PaystubService.find_contractor_assignment(
            employee_id,
            client_company_id,
            pay_period_begin
        )

        contractor_assignment_id = assignment['id'] if assignment else None

        # Save paystub
        saved_paystub = PaystubService.save_paystub(
            paystub_data=paystub_data,
            contractor_assignment_id=contractor_assignment_id,
            client_company_id=client_company_id,
            file_hash=file_hash,
            uploaded_by=user['user_id']
        )

        response = {
            "success": True,
            "message": "Paystub uploaded successfully",
            "paystub": {
                "id": saved_paystub['id'],
                "employee_id": saved_paystub['employee_id'],
                "employee_name": saved_paystub['employee_name'],
                "pay_period": f"{saved_paystub['pay_period_begin']} to {saved_paystub['pay_period_end']}",
                "gross_pay": saved_paystub['gross_pay'],
                "matched_contractor": contractor_assignment_id is not None
            }
        }

        # If matched to contractor, calculate and save earnings
        if assignment:
            try:
                earnings = calculate_contractor_earnings(paystub_data, assignment)

                saved_earnings = PaystubService.save_earnings(
                    paystub_id=saved_paystub['id'],
                    contractor_assignment_id=contractor_assignment_id,
                    earnings=earnings,
                    pay_period_begin=saved_paystub['pay_period_begin'],
                    pay_period_end=saved_paystub['pay_period_end']
                )

                response["earnings"] = {
                    "id": saved_earnings['id'],
                    "contractor_total": saved_earnings['contractor_total_earnings'],
                    "regular_earnings": saved_earnings['contractor_regular_earnings'],
                    "bonus_share": saved_earnings['contractor_bonus_share'],
                    "company_margin": saved_earnings['company_margin'],
                    "payment_status": saved_earnings['payment_status'],
                    "amount_pending": saved_earnings['amount_pending']
                }

                logger.info(f"✅ Paystub processed - Contractor earnings: ${saved_earnings['contractor_total_earnings']}")

            except Exception as e:
                logger.error(f"Earnings calculation failed: {str(e)}")
                response["earnings_error"] = str(e)
                response["message"] += " (earnings calculation failed)"

        else:
            response["message"] += " (no contractor match - earnings not calculated)"
            logger.warning(f"⚠️  No contractor matched for employee {employee_id}")

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystub upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process paystub: {str(e)}"
        )


@router.get("", response_model=List[dict])
async def list_paystubs(
    contractor_id: Optional[str] = None,
    client_company_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_admin)
):
    """
    List paystubs (admin only).

    Args:
        contractor_id: Filter by contractor UUID
        client_company_id: Filter by client company UUID
        limit: Maximum number of results
        user: Current user (admin)

    Returns:
        List of paystubs
    """
    try:
        query = supabase_admin_client.table("paystubs").select("*")

        if contractor_id:
            # Filter by contractor via assignment
            query = query.eq("contractor_assignment_id.contractor_id", contractor_id)

        if client_company_id:
            query = query.eq("client_company_id", client_company_id)

        result = query.order("created_at", desc=True).limit(limit).execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"Failed to list paystubs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve paystubs: {str(e)}"
        )


@router.get("/{paystub_id}")
async def get_paystub(
    paystub_id: int,
    user: dict = Depends(require_admin)
):
    """
    Get paystub details by ID (admin only).

    Args:
        paystub_id: Paystub ID
        user: Current user (admin)

    Returns:
        Paystub details with earnings
    """
    try:
        # Get paystub
        paystub_result = supabase_admin_client.table("paystubs").select("*").eq(
            "id", paystub_id
        ).execute()

        if not paystub_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paystub not found"
            )

        paystub = paystub_result.data[0]

        # Get associated earnings if they exist
        if paystub.get('contractor_assignment_id'):
            earnings_result = supabase_admin_client.table("contractor_earnings").select("*").eq(
                "paystub_id", paystub_id
            ).execute()

            if earnings_result.data:
                paystub['earnings'] = earnings_result.data[0]

        return paystub

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get paystub: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve paystub: {str(e)}"
        )
