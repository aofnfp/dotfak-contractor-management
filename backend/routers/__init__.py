"""
API routers for the Paystub Extractor backend.
"""

from backend.routers.auth import router as auth_router
from backend.routers.contractors import router as contractors_router
from backend.routers.clients import router as clients_router
from backend.routers.assignments import router as assignments_router
from backend.routers.paystubs import router as paystubs_router
from backend.routers.payments import router as payments_router
from backend.routers.earnings import router as earnings_router
from backend.routers.dashboard import router as dashboard_router
from backend.routers.onboarding import router as onboarding_router
from backend.routers.contracts import router as contracts_router
from backend.routers.managers import router as managers_router
from backend.routers.manager_assignments import router as manager_assignments_router
from backend.routers.manager_earnings import router as manager_earnings_router
from backend.routers.manager_onboarding import router as manager_onboarding_router
from backend.routers.devices import router as devices_router

__all__ = [
    "auth_router",
    "contractors_router",
    "clients_router",
    "assignments_router",
    "paystubs_router",
    "payments_router",
    "earnings_router",
    "dashboard_router",
    "onboarding_router",
    "contracts_router",
    "managers_router",
    "manager_assignments_router",
    "manager_earnings_router",
    "manager_onboarding_router",
    "devices_router",
]
