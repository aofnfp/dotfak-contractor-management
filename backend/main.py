#!/usr/bin/env python3
"""
FastAPI backend for DotFak Group LLC - Contractor Management Platform.

Provides REST API for:
- User authentication (signup, login) via Supabase
- Contractor management
- Paystub upload and parsing
- Earnings calculation and payment tracking
- Admin and contractor dashboards
"""

import sys
from pathlib import Path
from typing import List, Optional
from datetime import date
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
from dotenv import load_dotenv

# Add project root to path so we can import backend modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "tools"))

# Import backend modules
from backend.config import FRONTEND_URL, ENVIRONMENT, API_HOST, API_PORT
from backend.routers import (
    auth_router,
    contractors_router,
    clients_router,
    assignments_router,
    paystubs_router,
    payments_router,
    earnings_router,
    dashboard_router,
    onboarding_router,
    contracts_router,
)

# Import tools
from extract_pdf_text import extract_text_from_pdf
from parsers import get_parser, AVAILABLE_PARSERS

load_dotenv()

app = FastAPI(
    title="DotFak Contractor Management API",
    description="API for contractor management, paystub processing, and earnings tracking",
    version="1.0.0"
)

# CORS configuration - use frontend URL from config
allowed_origins = [FRONTEND_URL]
if ENVIRONMENT == "development":
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(contractors_router)
app.include_router(clients_router)
app.include_router(assignments_router)
app.include_router(paystubs_router)
app.include_router(payments_router)
app.include_router(earnings_router)
app.include_router(dashboard_router)
app.include_router(onboarding_router)
app.include_router(contracts_router)


# Pydantic models
class PaystubSummary(BaseModel):
    id: int
    employee_name: str
    pay_period_begin: date
    pay_period_end: date
    check_date: Optional[date]
    gross_pay: Optional[float]
    net_pay: Optional[float]
    organization: str


class UploadResponse(BaseModel):
    success: bool
    message: str
    paystubs_count: int
    paystubs: List[dict]


# Root endpoint
@app.get("/")
async def root():
    """API root - health check."""
    return {
        "service": "Paystub Extractor API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/debug/parser-version")
async def debug_parser_version():
    """Debug endpoint to check which parser version is loaded."""
    from parsers.ap_account_services_parser import APAccountServicesParser
    parser = APAccountServicesParser()

    # Try to read the actual parser file
    import inspect
    parser_file = inspect.getfile(APAccountServicesParser)

    return {
        "parser_version": parser.version,
        "parser_file_path": parser_file,
        "parser_class": str(APAccountServicesParser),
        "git_commit": "8bedf2ea",  # Latest commit
        "expected_version": "2.0-TOKEN-BASED-PARSER",
        "status": "OK" if parser.version == "2.0-TOKEN-BASED-PARSER" else "OUTDATED"
    }


@app.post("/debug/test-parse")
async def debug_test_parse(file: UploadFile = File(...)):
    """Debug: Parse a PDF and return raw results to verify parser works."""
    import sys

    # Save file temporarily
    tmp_dir = Path(__file__).parent.parent / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    pdf_path = tmp_dir / file.filename
    with open(pdf_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Extract text exactly like the upload endpoint
    text = extract_text_from_pdf(str(pdf_path))

    # Parse with the same get_parser flow
    parser_module = get_parser("ap_account_services")
    paystubs = parser_module.parse(text, file.filename)

    # Also test direct class instantiation
    from parsers.ap_account_services_parser import APAccountServicesParser
    direct_parser = APAccountServicesParser()
    direct_paystubs = direct_parser.parse(text, file.filename)

    # Clean up
    pdf_path.unlink()

    # Return diagnostic info
    return {
        "get_parser_module": str(parser_module),
        "get_parser_module_file": getattr(parser_module, '__file__', 'unknown'),
        "sys_modules_parser": str(sys.modules.get('parsers.ap_account_services_parser', 'NOT LOADED')),
        "total_paystubs_via_get_parser": len(paystubs),
        "total_paystubs_via_direct": len(direct_paystubs),
        "first_paystub_version_get_parser": paystubs[0].get('metadata', {}).get('parser_version') if paystubs else None,
        "first_paystub_version_direct": direct_paystubs[0].get('metadata', {}).get('parser_version') if direct_paystubs else None,
        "first_paystub_payment_info_get_parser": paystubs[0].get('payment_info', []) if paystubs else [],
        "first_paystub_payment_info_direct": direct_paystubs[0].get('payment_info', []) if direct_paystubs else [],
        "direct_parser_version": direct_parser.version,
    }


# Get available organizations
@app.get("/organizations")
async def get_organizations():
    """Get list of supported organizations."""
    return {
        "organizations": list(AVAILABLE_PARSERS.keys())
    }


# Upload and parse paystub
@app.post("/upload", response_model=UploadResponse)
async def upload_paystub(
    file: UploadFile = File(...),
    organization: str = Form(...)
):
    """
    Upload a paystub PDF and extract data.

    Args:
        file: PDF file to upload
        organization: Organization identifier

    Returns:
        Extracted paystub data
    """
    # Validate organization
    if organization not in AVAILABLE_PARSERS:
        raise HTTPException(
            status_code=400,
            detail=f"Organization '{organization}' not supported. "
                   f"Available: {list(AVAILABLE_PARSERS.keys())}"
        )

    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    try:
        # Save uploaded file temporarily
        tmp_dir = Path(__file__).parent.parent / ".tmp"
        tmp_dir.mkdir(exist_ok=True)

        pdf_path = tmp_dir / file.filename
        with open(pdf_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Extract text
        text = extract_text_from_pdf(str(pdf_path))

        # Parse with organization-specific parser
        parser_module = get_parser(organization)
        paystubs = parser_module.parse(text, file.filename)

        # Clean up temp file
        pdf_path.unlink()

        return UploadResponse(
            success=True,
            message=f"Successfully extracted {len(paystubs)} paystub(s)",
            paystubs_count=len(paystubs),
            paystubs=paystubs
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )


# Save paystubs to database
@app.post("/paystubs/save")
async def save_paystubs(paystubs: List[dict]):
    """
    Save paystubs to database.

    Args:
        paystubs: List of paystub dictionaries

    Returns:
        Success message with record IDs
    """
    try:
        from save_paystub_to_db import save_paystub

        record_ids = []
        for paystub in paystubs:
            record_id = save_paystub(paystub)
            record_ids.append(record_id)

        return {
            "success": True,
            "message": f"Saved {len(record_ids)} paystub(s)",
            "record_ids": record_ids
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save paystubs: {str(e)}"
        )


# Get paystubs with filtering
@app.get("/paystubs")
async def get_paystubs(
    employee_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    organization: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Get paystubs with optional filtering.

    Args:
        employee_id: Filter by employee ID
        start_date: Filter by pay period start date (>=)
        end_date: Filter by pay period end date (<=)
        organization: Filter by organization
        limit: Maximum number of results

    Returns:
        List of paystubs
    """
    try:
        from backend.config import supabase_admin_client

        # Build query using Supabase client
        query = supabase_admin_client.table("paystubs").select("*")

        if employee_id:
            query = query.eq("employee_id", employee_id)

        if start_date:
            query = query.gte("pay_period_begin", str(start_date))

        if end_date:
            query = query.lte("pay_period_end", str(end_date))

        if organization:
            query = query.eq("organization", organization)

        # Execute query with ordering and limit
        result = query.order("pay_period_begin", desc=True).limit(limit).execute()

        # Enrich paystubs with contractor and client details
        enriched_paystubs = []
        for paystub in result.data or []:
            enriched = dict(paystub)

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
                    else:
                        enriched['contractor_name'] = None
                        enriched['contractor_code'] = None
                else:
                    enriched['contractor_name'] = None
                    enriched['contractor_code'] = None
            else:
                enriched['contractor_name'] = None
                enriched['contractor_code'] = None

            # Add client details
            if paystub.get('client_company_id'):
                client = supabase_admin_client.table("client_companies").select(
                    "name, code"
                ).eq("id", paystub['client_company_id']).execute()

                if client.data:
                    enriched['client_name'] = client.data[0]['name']
                    enriched['client_code'] = client.data[0]['code']
                else:
                    enriched['client_name'] = None
                    enriched['client_code'] = None
            else:
                enriched['client_name'] = None
                enriched['client_code'] = None

            # Add uploader email
            if paystub.get('uploaded_by'):
                uploader = supabase_admin_client.table("contractors").select(
                    "email"
                ).eq("auth_user_id", paystub['uploaded_by']).execute()

                if uploader.data:
                    enriched['uploader_email'] = uploader.data[0]['email']
                else:
                    enriched['uploader_email'] = None
            else:
                enriched['uploader_email'] = None

            enriched_paystubs.append(enriched)

        return enriched_paystubs

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve paystubs: {str(e)}"
        )


# Get single paystub by ID
@app.get("/paystubs/{paystub_id}")
async def get_paystub(paystub_id: int):
    """Get complete paystub data by ID."""
    try:
        from backend.config import supabase_admin_client

        # Query using Supabase client
        result = supabase_admin_client.table("paystubs").select("*").eq("id", paystub_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="Paystub not found"
            )

        paystub = result.data[0]
        enriched = dict(paystub)

        print(f"🔍 Enriching paystub {paystub_id}: assignment_id={paystub.get('contractor_assignment_id')}, client_id={paystub.get('client_company_id')}")

        # Add contractor details
        if paystub.get('contractor_assignment_id'):
            assignment = supabase_admin_client.table("contractor_assignments").select(
                "contractor_id"
            ).eq("id", paystub['contractor_assignment_id']).execute()

            print(f"  📋 Assignment: {assignment.data}")

            if assignment.data:
                contractor = supabase_admin_client.table("contractors").select(
                    "first_name, last_name, contractor_code"
                ).eq("id", assignment.data[0]['contractor_id']).execute()

                print(f"  👤 Contractor: {contractor.data}")

                if contractor.data:
                    c = contractor.data[0]
                    enriched['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                    enriched['contractor_code'] = c['contractor_code']
                    print(f"  ✅ Added contractor: {enriched['contractor_name']}")
                else:
                    enriched['contractor_name'] = None
                    enriched['contractor_code'] = None
            else:
                enriched['contractor_name'] = None
                enriched['contractor_code'] = None
        else:
            enriched['contractor_name'] = None
            enriched['contractor_code'] = None

        # Add client details
        if paystub.get('client_company_id'):
            client = supabase_admin_client.table("client_companies").select(
                "name, code"
            ).eq("id", paystub['client_company_id']).execute()

            print(f"  🏢 Client: {client.data}")

            if client.data:
                enriched['client_name'] = client.data[0]['name']
                enriched['client_code'] = client.data[0]['code']
                print(f"  ✅ Added client: {enriched['client_name']}")
            else:
                enriched['client_name'] = None
                enriched['client_code'] = None
        else:
            enriched['client_name'] = None
            enriched['client_code'] = None

        # Add uploader email
        if paystub.get('uploaded_by'):
            uploader = supabase_admin_client.table("contractors").select(
                "email"
            ).eq("auth_user_id", paystub['uploaded_by']).execute()

            if uploader.data:
                enriched['uploader_email'] = uploader.data[0]['email']
            else:
                enriched['uploader_email'] = None
        else:
            enriched['uploader_email'] = None

        return enriched

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve paystub: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
