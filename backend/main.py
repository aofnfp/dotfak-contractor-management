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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    managers_router,
    manager_assignments_router,
    manager_earnings_router,
    manager_onboarding_router,
    devices_router,
)

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
app.include_router(managers_router)
app.include_router(manager_assignments_router)
app.include_router(manager_earnings_router)
app.include_router(manager_onboarding_router)
app.include_router(devices_router)


@app.get("/")
async def root():
    """API root - health check."""
    return {
        "service": "DotFak Contractor Management API",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
