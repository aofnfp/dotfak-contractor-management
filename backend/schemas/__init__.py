"""
Pydantic schemas for request/response validation.
"""

from backend.schemas.contractor import (
    ContractorBase,
    ContractorCreate,
    ContractorUpdate,
    ContractorResponse,
    ContractorListItem,
    AssignmentBase,
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentWithDetails,
)

from backend.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentListItem,
    EarningsResponse,
    EarningsDetailResponse,
    EarningsSummary,
    AllocationResponse,
    AllocationRequest,
)

__all__ = [
    "ContractorBase",
    "ContractorCreate",
    "ContractorUpdate",
    "ContractorResponse",
    "ContractorListItem",
    "AssignmentBase",
    "AssignmentCreate",
    "AssignmentUpdate",
    "AssignmentResponse",
    "AssignmentWithDetails",
    "PaymentCreate",
    "PaymentResponse",
    "PaymentListItem",
    "EarningsResponse",
    "EarningsDetailResponse",
    "EarningsSummary",
    "AllocationResponse",
    "AllocationRequest",
]
