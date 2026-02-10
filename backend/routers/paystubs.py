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
from backend.services import PaystubService, calculate_contractor_earnings, BankAccountService
from backend.schemas import (
    CheckAccountsResponse,
    AccountAssignmentRequest,
    AccountAssignmentResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/paystubs", tags=["paystubs"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_paystub_with_earnings(
    file: UploadFile = File(...),
    client_company_id: str = Form(...),
    contractor_assignment_id: Optional[str] = Form(None),
    user: dict = Depends(require_admin)
):
    """
    Upload paystub PDF with automatic contractor matching and earnings calculation (admin only).

    This endpoint:
    1. Validates and parses the PDF
    2. Checks for duplicates (SHA-256 hash)
    3. Auto-matches to contractor assignment (by employee_id) if not provided
    4. Calculates contractor earnings (fixed or percentage rate)
    5. Saves paystub and earnings to database

    Args:
        file: PDF file to upload
        client_company_id: UUID of the client company
        contractor_assignment_id: Optional UUID of contractor assignment (for manual assignment)
        user: Current user (admin)

    Returns:
        Paystub and earnings details
    """
    try:
        # Get client company to determine organization
        client_result = supabase_admin_client.table("client_companies").select("*").eq("id", client_company_id).execute()

        if not client_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client company not found: {client_company_id}"
            )

        client_company = client_result.data[0]
        organization = client_company.get('code', 'ap_account_services')  # Use code as organization identifier

        # Validate organization parser exists
        if organization not in AVAILABLE_PARSERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No parser available for organization '{organization}'. "
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

        logger.info(f"📄 Parsed {len(paystubs)} paystub(s) from PDF")

        # Process ALL paystubs from the PDF
        processed_paystubs = []
        skipped_count = 0
        errors = []

        for idx, paystub_data in enumerate(paystubs, 1):
            try:
                pay_period_begin = paystub_data.get('header', {}).get('pay_period', {}).get('begin')
                pay_period_end = paystub_data.get('header', {}).get('pay_period', {}).get('end')
                employee_id = paystub_data.get('header', {}).get('employee', {}).get('id')

                print(f"🔍 Processing paystub {idx}/{len(paystubs)}: Period {pay_period_begin} to {pay_period_end}, Employee: {employee_id}")

                if not pay_period_begin:
                    print(f"⚠️  Paystub {idx}: Missing pay period - skipping")
                    errors.append(f"Paystub {idx}: Missing pay period")
                    skipped_count += 1
                    continue

                # Get gross pay from current paystub
                current_gross_pay = paystub_data.get('summary', {}).get('current', {}).get('gross_pay', 0)

                # Check for duplicate pay period AND gross pay for this employee
                # This allows multiple paystubs for the same period if they have different amounts
                # (e.g., detailed paystub vs summary/YTD paystub)
                if employee_id:
                    existing_period = supabase_admin_client.table("paystubs").select("id, gross_pay").eq(
                        "employee_id", employee_id
                    ).eq("pay_period_begin", pay_period_begin).eq("pay_period_end", pay_period_end).execute()

                    if existing_period.data:
                        # Check if any existing paystub has the same gross pay (within $0.01 tolerance)
                        is_duplicate = any(
                            abs(float(existing['gross_pay']) - float(current_gross_pay)) < 0.01
                            for existing in existing_period.data
                        )

                        if is_duplicate:
                            print(f"⏭️  Paystub {idx}: Duplicate found - same period and gross pay (${current_gross_pay}) - skipping")
                            errors.append(f"Paystub {idx}: Duplicate - same period and gross pay ${current_gross_pay}")
                            skipped_count += 1
                            continue
                        else:
                            print(f"ℹ️  Paystub {idx}: Same period but different gross pay (${current_gross_pay}) - saving as separate record")

                assignment = None
                auto_matched = False
                current_contractor_assignment_id = contractor_assignment_id

                # If contractor assignment provided manually, use it
                if contractor_assignment_id:
                    # Verify assignment exists and belongs to this client
                    assignment_result = supabase_admin_client.table("contractor_assignments").select("*").eq(
                        "id", contractor_assignment_id
                    ).eq("client_company_id", client_company_id).execute()

                    if not assignment_result.data:
                        print(f"⚠️  Paystub {idx}: Contractor assignment not found - skipping")
                        errors.append(f"Paystub {idx}: Contractor assignment not found")
                        skipped_count += 1
                        continue

                    assignment = assignment_result.data[0]
                else:
                    # Try to auto-match by employee ID
                    if employee_id:
                        assignment = PaystubService.find_contractor_assignment(
                            employee_id,
                            client_company_id,
                            pay_period_begin
                        )

                        if assignment:
                            current_contractor_assignment_id = assignment['id']
                            auto_matched = True

                # Save paystub
                saved_paystub = PaystubService.save_paystub(
                    paystub_data=paystub_data,
                    contractor_assignment_id=current_contractor_assignment_id,
                    client_company_id=client_company_id,
                    file_hash=file_hash,
                    uploaded_by=user['user_id'],
                    file_name=file.filename,
                    file_size=len(file_content),
                    file_path=str(pdf_path)
                )

                # Build paystub response with details from database
                paystub_with_details = {
                    "id": saved_paystub['id'],
                    "contractor_assignment_id": current_contractor_assignment_id,
                    "client_company_id": client_company_id,
                    "file_name": file.filename,
                    "pay_period_begin": saved_paystub['pay_period_begin'],
                    "pay_period_end": saved_paystub['pay_period_end'],
                    "gross_pay": saved_paystub['gross_pay'],
                    "net_pay": saved_paystub.get('net_pay', 0),
                    "total_hours": saved_paystub.get('total_hours'),
                    "auto_matched": auto_matched,
                    "contractor_name": assignment.get('contractor', {}).get('first_name') if assignment else None,
                    "contractor_code": assignment.get('contractor', {}).get('contractor_code') if assignment else None,
                }

                # If matched to contractor, calculate and save earnings
                if assignment:
                    try:
                        earnings = calculate_contractor_earnings(paystub_data, assignment)

                        saved_earnings = PaystubService.save_earnings(
                            paystub_id=saved_paystub['id'],
                            contractor_assignment_id=current_contractor_assignment_id,
                            earnings=earnings,
                            pay_period_begin=saved_paystub['pay_period_begin'],
                            pay_period_end=saved_paystub['pay_period_end']
                        )

                        paystub_with_details["earnings"] = {
                            "id": saved_earnings['id'],
                            "contractor_total": saved_earnings['contractor_total_earnings'],
                            "regular_earnings": saved_earnings['contractor_regular_earnings'],
                            "bonus_share": saved_earnings['contractor_bonus_share'],
                        }

                        logger.info(f"✅ Paystub {idx} processed - Contractor earnings: ${saved_earnings['contractor_total_earnings']}")

                    except Exception as e:
                        logger.error(f"❌ Paystub {idx} earnings calculation failed: {str(e)}")
                        paystub_with_details["earnings_error"] = str(e)
                        errors.append(f"Paystub {idx}: {str(e)}")

                processed_paystubs.append(paystub_with_details)
                print(f"✅ Paystub {idx}/{len(paystubs)} saved: {pay_period_begin} to {pay_period_end}")

            except Exception as e:
                print(f"❌ Paystub {idx} failed: {str(e)}")
                errors.append(f"Paystub {idx}: {str(e)}")
                continue

        # Build final response
        if not processed_paystubs and not skipped_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No paystubs could be processed"
            )

        response = {
            "success": True,
            "message": f"Processed {len(processed_paystubs)} paystub(s) successfully",
            "total_parsed": len(paystubs),
            "total_processed": len(processed_paystubs),
            "total_skipped": skipped_count,
            "paystubs": processed_paystubs
        }

        if errors:
            response["errors"] = errors
            response["message"] += f" ({len(errors)} error(s) occurred)"

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystub upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process paystub: {str(e)}"
        )


@router.get("/{paystub_id}/check-accounts", response_model=CheckAccountsResponse)
async def check_paystub_accounts(
    paystub_id: int,
    user: dict = Depends(require_admin)
):
    """
    Check if paystub has unassigned bank accounts (admin only).

    This endpoint:
    1. Gets the paystub's payment_info from paystub_data
    2. For each account, checks if it exists in bank_accounts table
    3. Auto-assigns existing accounts by creating paystub_account_splits
    4. Returns list of NEW accounts that need manual assignment

    Args:
        paystub_id: ID of the paystub to check
        user: Current user (admin)

    Returns:
        CheckAccountsResponse with unassigned accounts list
    """
    try:
        result = BankAccountService.check_paystub_accounts(paystub_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error checking accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check accounts: {str(e)}"
        )


@router.post("/{paystub_id}/assign-accounts", response_model=AccountAssignmentResponse)
async def assign_paystub_accounts(
    paystub_id: int,
    assignment_request: AccountAssignmentRequest,
    user: dict = Depends(require_admin)
):
    """
    Assign NEW bank accounts from a paystub (admin only).

    This endpoint is called AFTER upload when new accounts are detected.
    It:
    1. Creates bank_accounts entries for new accounts
    2. Creates paystub_account_splits entries linking paystub to accounts
    3. Returns success with count of assigned accounts

    Args:
        paystub_id: ID of the paystub
        assignment_request: List of account assignments
        user: Current user (admin)

    Returns:
        AccountAssignmentResponse with success status
    """
    try:
        # Convert Pydantic model to list of dicts
        assignments = [
            {
                "account_last4": item.account_last4,
                "owner_type": item.owner_type,
                "owner_id": str(item.owner_id)
            }
            for item in assignment_request.assignments
        ]

        result = BankAccountService.assign_accounts(paystub_id, assignments)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error assigning accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign accounts: {str(e)}"
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

        # Batch fetch account splits for all paystubs (for contractor/admin amounts)
        paystub_ids = [p['id'] for p in result.data or []]
        splits_by_paystub = {}
        if paystub_ids:
            try:
                splits_result = supabase_admin_client.table("paystub_account_splits").select(
                    "paystub_id, amount, bank_account_id, bank_accounts!inner(owner_type)"
                ).in_("paystub_id", paystub_ids).execute()

                for split in splits_result.data or []:
                    pid = split['paystub_id']
                    if pid not in splits_by_paystub:
                        splits_by_paystub[pid] = {'contractor': 0.0, 'admin': 0.0}
                    owner_type = split['bank_accounts']['owner_type']
                    splits_by_paystub[pid][owner_type] += float(split['amount'])
            except Exception as split_err:
                logger.warning(f"Failed to fetch account splits: {split_err}")

        # Enrich paystubs with contractor and client details
        enriched_paystubs = []
        for paystub in result.data or []:
            enriched = dict(paystub)

            # Compute total hours from earnings in paystub_data
            paystub_data = paystub.get('paystub_data') or {}
            earnings_list = paystub_data.get('earnings', [])
            total_hours = sum(float(e.get('hours') or 0) for e in earnings_list)
            enriched['total_hours'] = total_hours if total_hours > 0 else None

            # Add account split amounts (contractor vs admin)
            splits = splits_by_paystub.get(paystub['id'])
            enriched['contractor_amount'] = splits['contractor'] if splits else None
            enriched['admin_amount'] = splits['admin'] if splits else None

            # Add contractor details
            if paystub.get('contractor_assignment_id'):
                assignment = supabase_admin_client.table("contractor_assignments").select(
                    "contractor_id"
                ).eq("id", paystub['contractor_assignment_id']).execute()

                if assignment.data:
                    contractor = supabase_admin_client.table("contractors").select(
                        "first_name, last_name, contractor_code"
                    ).eq("id", assignment.data[0]['contractor_id']).execute()

                    if contractor.data:
                        c = contractor.data[0]
                        enriched['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                        enriched['contractor_code'] = c['contractor_code']

            # Add client details
            if paystub.get('client_company_id'):
                client = supabase_admin_client.table("client_companies").select(
                    "name, code"
                ).eq("id", paystub['client_company_id']).execute()

                if client.data:
                    enriched['client_name'] = client.data[0]['name']
                    enriched['client_code'] = client.data[0]['code']

            enriched_paystubs.append(enriched)

        return enriched_paystubs

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

        # Compute total hours from earnings in paystub_data
        paystub_data = paystub.get('paystub_data') or {}
        earnings_list = paystub_data.get('earnings', [])
        total_hours = sum(float(e.get('hours') or 0) for e in earnings_list)
        paystub['total_hours'] = total_hours if total_hours > 0 else None

        # Get associated earnings if they exist
        if paystub.get('contractor_assignment_id'):
            earnings_result = supabase_admin_client.table("contractor_earnings").select("*").eq(
                "paystub_id", paystub_id
            ).execute()

            if earnings_result.data:
                paystub['earnings'] = earnings_result.data[0]

        # Enrich with contractor and client details
        if paystub.get('contractor_assignment_id'):
            assignment = supabase_admin_client.table("contractor_assignments").select(
                "contractor_id"
            ).eq("id", paystub['contractor_assignment_id']).execute()

            if assignment.data:
                contractor = supabase_admin_client.table("contractors").select(
                    "first_name, last_name, contractor_code"
                ).eq("id", assignment.data[0]['contractor_id']).execute()

                if contractor.data:
                    c = contractor.data[0]
                    paystub['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                    paystub['contractor_code'] = c['contractor_code']

        if paystub.get('client_company_id'):
            client = supabase_admin_client.table("client_companies").select(
                "name, code"
            ).eq("id", paystub['client_company_id']).execute()

            if client.data:
                paystub['client_name'] = client.data[0]['name']
                paystub['client_code'] = client.data[0]['code']

        # Get payment distribution (account splits with bank details)
        try:
            splits_result = supabase_admin_client.table("paystub_account_splits").select(
                "amount, currency, bank_accounts(bank_name, account_last4, account_name, owner_type)"
            ).eq("paystub_id", paystub_id).execute()

            if splits_result.data:
                paystub['payment_distribution'] = [
                    {
                        'bank_name': s['bank_accounts']['bank_name'],
                        'account_last4': s['bank_accounts']['account_last4'],
                        'account_name': s['bank_accounts']['account_name'],
                        'owner_type': s['bank_accounts']['owner_type'],
                        'amount': float(s['amount']),
                        'currency': s['currency'],
                    }
                    for s in splits_result.data
                ]
            else:
                paystub['payment_distribution'] = []
        except Exception as split_err:
            logger.warning(f"Failed to fetch payment distribution: {split_err}")
            paystub['payment_distribution'] = []

        return paystub

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get paystub: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve paystub: {str(e)}"
        )
