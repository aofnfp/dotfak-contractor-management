#!/usr/bin/env python3
"""
Pydantic schemas for contract-related data.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ============================================================================
# Contract Schemas
# ============================================================================

class ContractResponse(BaseModel):
    """Schema for full contract response."""
    id: UUID
    contractor_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    assignment_id: Optional[UUID] = None
    contract_type: str
    version: int
    parent_contract_id: Optional[UUID] = None
    status: str
    html_content: str
    contract_data: Optional[dict] = None
    pdf_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contractor_name: Optional[str] = None
    manager_name: Optional[str] = None
    client_name: Optional[str] = None
    signatures: Optional[List[dict]] = None

    class Config:
        from_attributes = True


class ContractListItem(BaseModel):
    """Schema for contract in list view."""
    id: UUID
    contractor_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    assignment_id: Optional[UUID] = None
    contract_type: str
    version: int
    status: str
    pdf_url: Optional[str] = None
    contract_data: Optional[dict] = None
    created_at: datetime
    contractor_name: Optional[str] = None
    contractor_code: Optional[str] = None
    manager_name: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Signature Schemas
# ============================================================================

class SignContractRequest(BaseModel):
    """Schema for signing a contract."""
    signature_data: str = Field(..., description="Base64 encoded signature image")
    signature_method: str = Field(..., pattern="^(draw|type)$", description="How signature was created: draw or type")
    signer_name: str = Field(..., min_length=1, description="Full name of signer")


class SignatureResponse(BaseModel):
    """Schema for signature response."""
    id: UUID
    contract_id: UUID
    signer_type: str
    signer_name: str
    signature_method: str
    signed_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Amendment Schemas
# ============================================================================

class GenerateAmendmentRequest(BaseModel):
    """Schema for generating a contract amendment."""
    assignment_id: UUID
    changes_summary: Optional[str] = Field(None, description="Human-readable summary of what changed")
