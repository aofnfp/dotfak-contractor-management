"""
API routers for the Paystub Extractor backend.
"""

from backend.routers.auth import router as auth_router
from backend.routers.contractors import router as contractors_router
from backend.routers.assignments import router as assignments_router
from backend.routers.paystubs import router as paystubs_router
from backend.routers.payments import router as payments_router
from backend.routers.earnings import router as earnings_router

__all__ = [
    "auth_router",
    "contractors_router",
    "assignments_router",
    "paystubs_router",
    "payments_router",
    "earnings_router"
]
