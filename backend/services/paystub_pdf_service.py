"""
Paystub PDF rendering service.

Renders the DotFak-branded `paystub_template.html` against a paystub record
and returns the resulting PDF as bytes. Reuses WeasyPrint (already a project
dep) and the brand constants used by contracts.
"""

from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging

from jinja2 import Environment, FileSystemLoader, select_autoescape

from backend.constants.brand import COMPANY_LOGO_BASE64

logger = logging.getLogger(__name__)

# Earning descriptions whose hours duplicate a base line — same list the
# paystubs router uses to compute total_hours.
_SUPPLEMENTAL_KEYWORDS = ("premium", "differential", "group term life", "gtl", "gross up")


def _is_supplemental(description: str) -> bool:
    desc = (description or "").lower()
    return any(kw in desc for kw in _SUPPLEMENTAL_KEYWORDS)


def _format_date_human(value: Any) -> str:
    """Format an ISO date / datetime string as 'Mon DD, YYYY'."""
    if not value:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%b %d, %Y")
    try:
        return datetime.fromisoformat(str(value)).strftime("%b %d, %Y")
    except Exception:
        return str(value)


def _build_context(paystub: Dict[str, Any]) -> Dict[str, Any]:
    """Pull a flat template context from a paystub row + its paystub_data JSON."""
    paystub_data = paystub.get("paystub_data") or {}
    header = paystub_data.get("header") or {}
    summary = paystub_data.get("summary") or {}
    current = summary.get("current") or {}
    ytd = summary.get("ytd") or {}

    earnings: List[Dict[str, Any]] = paystub_data.get("earnings") or []
    taxes: List[Dict[str, Any]] = paystub_data.get("taxes") or []

    # Compute total hours, excluding supplemental lines (Premium/Diff/GTL/etc.)
    total_hours = sum(
        float(e.get("hours") or 0)
        for e in earnings
        if not _is_supplemental(e.get("description", ""))
    )

    return {
        "company_logo": COMPANY_LOGO_BASE64,
        "generated_at": datetime.utcnow().strftime("%b %d, %Y at %H:%M UTC"),

        "contractor_name": paystub.get("contractor_name"),
        "contractor_code": paystub.get("contractor_code"),
        "employee_name": (header.get("employee") or {}).get("name") or paystub.get("employee_name"),
        "employee_id": (header.get("employee") or {}).get("id") or paystub.get("employee_id"),
        "job_title": (header.get("employee") or {}).get("title"),

        "client_name": paystub.get("client_name") or (header.get("company") or {}).get("name"),

        "pay_period_begin_human": _format_date_human(paystub.get("pay_period_begin")),
        "pay_period_end_human": _format_date_human(paystub.get("pay_period_end")),
        "check_date_human": _format_date_human(paystub.get("check_date")),
        "check_number": header.get("check_number"),

        "gross_pay": float(paystub.get("gross_pay") or current.get("gross_pay") or 0),
        "net_pay": float(paystub.get("net_pay") or current.get("net_pay") or 0),
        "employee_taxes": float(current.get("employee_taxes") or 0),
        "total_hours": total_hours if total_hours > 0 else None,

        "ytd_gross_pay": float(ytd.get("gross_pay") or 0),
        "ytd_employee_taxes": float(ytd.get("employee_taxes") or 0),

        "earnings": earnings,
        "taxes": taxes,
    }


def render_paystub_pdf(paystub: Dict[str, Any]) -> bytes:
    """Render a paystub dict to PDF bytes using WeasyPrint.

    Args:
        paystub: Enriched paystub record (must include contractor_name, client_name,
                 pay_period_begin/end, gross_pay, net_pay, and paystub_data JSON).

    Returns:
        PDF bytes.

    Raises:
        ImportError: If WeasyPrint is not installed.
    """
    from weasyprint import HTML

    templates_dir = Path(__file__).parent.parent / "templates"
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html"]),
    )
    template = env.get_template("paystub_template.html")
    html_content = template.render(**_build_context(paystub))

    return HTML(string=html_content).write_pdf()


def build_pdf_filename(paystub: Dict[str, Any]) -> str:
    """Build a stable, human-friendly download filename."""
    contractor = (paystub.get("contractor_code") or paystub.get("employee_name") or "paystub").replace(" ", "_")
    period = paystub.get("pay_period_begin") or "unknown"
    return f"DotFak_Paystub_{contractor}_{period}.pdf"
