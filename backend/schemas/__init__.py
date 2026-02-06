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

from backend.schemas.bank_account import (
    BankAccountBase,
    BankAccountCreate,
    BankAccountUpdate,
    BankAccountResponse,
    UnassignedAccountInfo,
    AccountAssignmentItem,
    AccountAssignmentRequest,
    AccountAssignmentResponse,
    CheckAccountsResponse,
    PaystubAccountSplitBase,
    PaystubAccountSplitCreate,
    PaystubAccountSplitResponse,
    PaystubAccountSplitWithDetails,
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
    "BankAccountBase",
    "BankAccountCreate",
    "BankAccountUpdate",
    "BankAccountResponse",
    "UnassignedAccountInfo",
    "AccountAssignmentItem",
    "AccountAssignmentRequest",
    "AccountAssignmentResponse",
    "CheckAccountsResponse",
    "PaystubAccountSplitBase",
    "PaystubAccountSplitCreate",
    "PaystubAccountSplitResponse",
    "PaystubAccountSplitWithDetails",
]
