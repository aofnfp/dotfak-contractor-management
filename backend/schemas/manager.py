"""
Pydantic schemas for manager-related request/response validation.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# --- Manager schemas ---

class ManagerBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None


class ManagerCreate(ManagerBase):
    notes: Optional[str] = None
    is_active: bool = True


class ManagerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ManagerResponse(ManagerBase):
    id: str
    auth_user_id: Optional[str] = None
    onboarding_status: str = "not_invited"
    is_active: bool = True
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ManagerListItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    onboarding_status: str = "not_invited"
    is_active: bool = True
    created_at: Optional[datetime] = None
    managed_count: Optional[int] = None

    class Config:
        from_attributes = True


# --- Manager Assignment schemas ---

class ManagerAssignmentBase(BaseModel):
    manager_id: str
    contractor_assignment_id: str
    flat_hourly_rate: float
    start_date: date


class ManagerAssignmentCreate(ManagerAssignmentBase):
    end_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None


class ManagerAssignmentUpdate(BaseModel):
    flat_hourly_rate: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ManagerAssignmentResponse(ManagerAssignmentBase):
    id: str
    end_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Enriched fields
    manager_name: Optional[str] = None
    contractor_name: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Manager Earnings schemas ---

class ManagerEarningsResponse(BaseModel):
    id: str
    manager_id: str
    manager_assignment_id: str
    paystub_id: int
    contractor_assignment_id: str
    pay_period_begin: Optional[date] = None
    pay_period_end: Optional[date] = None
    staff_total_hours: float = 0
    flat_hourly_rate: float
    total_earnings: float = 0
    amount_paid: float = 0
    amount_pending: float = 0
    payment_status: str = "unpaid"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # Enriched fields
    manager_name: Optional[str] = None
    contractor_name: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


class ManagerEarningsSummary(BaseModel):
    total_earnings: float = 0
    total_paid: float = 0
    total_pending: float = 0
    count_total: int = 0
    count_paid: int = 0
    count_unpaid: int = 0
    count_partially_paid: int = 0


# --- Device schemas ---

class DeviceBase(BaseModel):
    contractor_assignment_id: str
    device_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None


class DeviceCreate(DeviceBase):
    manager_assignment_id: Optional[str] = None
    status: str = "received"
    credentials: Optional[dict] = None
    received_date: Optional[date] = None
    delivered_date: Optional[date] = None
    notes: Optional[str] = None


class DeviceUpdate(BaseModel):
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    credentials: Optional[dict] = None
    received_date: Optional[date] = None
    delivered_date: Optional[date] = None
    returned_date: Optional[date] = None
    notes: Optional[str] = None


class DeviceResponse(DeviceBase):
    id: str
    manager_assignment_id: Optional[str] = None
    status: str = "received"
    credentials: Optional[dict] = None
    received_date: Optional[date] = None
    delivered_date: Optional[date] = None
    returned_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Enriched fields
    contractor_name: Optional[str] = None
    client_name: Optional[str] = None
    manager_name: Optional[str] = None

    class Config:
        from_attributes = True
