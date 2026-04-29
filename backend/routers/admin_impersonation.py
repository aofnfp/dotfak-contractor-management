"""Admin impersonation router.

Endpoints:
- GET  /admin/impersonate/targets   — list contractors/managers an admin can impersonate
- POST /admin/impersonate/start     — record an audit_log entry; returns the target's identity
- POST /admin/impersonate/stop      — record an audit_log entry; client-side just clears state

Impersonation itself is enforced in `verify_token` via the `X-Impersonate-User`
header (auth_user_id of the target). Admin sets that header on subsequent
GET requests; the backend swaps the resolved identity but only on GETs.
"""

from typing import Optional, List, Dict, Any
import logging

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from backend.config import supabase_admin_client
from backend.dependencies import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/impersonate", tags=["admin-impersonation"])


class ImpersonationTarget(BaseModel):
    auth_user_id: str
    role: str  # 'contractor' | 'manager'
    name: str
    code: Optional[str] = None
    email: Optional[str] = None


class StartImpersonationRequest(BaseModel):
    target_auth_user_id: str


class StartImpersonationResponse(BaseModel):
    target: ImpersonationTarget


def _audit(user: Dict[str, Any], action: str, entity_id: Optional[str], details: Dict[str, Any]) -> None:
    """Best-effort audit log entry — never block the request on logging failure."""
    try:
        supabase_admin_client.table("audit_log").insert({
            "user_id": user["user_id"],
            "action": action,
            "entity_type": "impersonation",
            "entity_id": entity_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to record impersonation audit: {e}")


@router.get("/targets", response_model=List[ImpersonationTarget])
async def list_impersonation_targets(user: dict = Depends(require_admin)):
    """List all contractors and managers this admin can impersonate.

    Only users with a linked `auth_user_id` can be impersonated since that's
    what the X-Impersonate-User header resolves against.
    """
    targets: List[ImpersonationTarget] = []

    contractors_result = supabase_admin_client.table("contractors").select(
        "auth_user_id, first_name, last_name, contractor_code, email, is_active"
    ).not_.is_("auth_user_id", "null").eq("is_active", True).execute()

    for c in contractors_result.data or []:
        targets.append(ImpersonationTarget(
            auth_user_id=c["auth_user_id"],
            role="contractor",
            name=f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            code=c.get("contractor_code"),
            email=c.get("email"),
        ))

    managers_result = supabase_admin_client.table("managers").select(
        "auth_user_id, first_name, last_name, email, is_active"
    ).not_.is_("auth_user_id", "null").eq("is_active", True).execute()

    for m in managers_result.data or []:
        targets.append(ImpersonationTarget(
            auth_user_id=m["auth_user_id"],
            role="manager",
            name=f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
            code=None,
            email=m.get("email"),
        ))

    targets.sort(key=lambda t: (t.role, t.name.lower()))
    return targets


@router.post("/start", response_model=StartImpersonationResponse)
async def start_impersonation(
    body: StartImpersonationRequest,
    user: dict = Depends(require_admin),
):
    """Resolve the target user, write an audit_log entry, and return the target identity.

    The frontend stores `target_auth_user_id` and starts attaching it as the
    `X-Impersonate-User` header on subsequent GETs.
    """
    target_id = body.target_auth_user_id

    # Look up the target — try contractor first, then manager
    contractor = supabase_admin_client.table("contractors").select(
        "auth_user_id, first_name, last_name, contractor_code, email"
    ).eq("auth_user_id", target_id).limit(1).execute()

    target: Optional[ImpersonationTarget] = None
    if contractor.data:
        c = contractor.data[0]
        target = ImpersonationTarget(
            auth_user_id=c["auth_user_id"],
            role="contractor",
            name=f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            code=c.get("contractor_code"),
            email=c.get("email"),
        )
    else:
        manager = supabase_admin_client.table("managers").select(
            "auth_user_id, first_name, last_name, email"
        ).eq("auth_user_id", target_id).limit(1).execute()
        if manager.data:
            m = manager.data[0]
            target = ImpersonationTarget(
                auth_user_id=m["auth_user_id"],
                role="manager",
                name=f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
                email=m.get("email"),
            )

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impersonation target not found or has no linked auth user",
        )

    _audit(user, "impersonation.start", target.auth_user_id, {
        "target_role": target.role,
        "target_name": target.name,
        "target_email": target.email,
    })
    logger.info(f"Admin {user['email']} started impersonating {target.role} {target.name} ({target.auth_user_id})")

    return StartImpersonationResponse(target=target)


@router.post("/stop")
async def stop_impersonation(
    body: StartImpersonationRequest,
    user: dict = Depends(require_admin),
):
    """Record the end of an impersonation session in audit_log."""
    _audit(user, "impersonation.stop", body.target_auth_user_id, {})
    logger.info(f"Admin {user['email']} stopped impersonating {body.target_auth_user_id}")
    return {"success": True}
