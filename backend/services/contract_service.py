#!/usr/bin/env python3
"""
Contract service - generates contracts from templates, handles PDF generation.
"""

import os
import logging
from datetime import datetime
from typing import Optional
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# Material fields that trigger an amendment when changed
MATERIAL_FIELDS = {"rate_type", "fixed_hourly_rate", "percentage_rate", "bonus_split_percentage", "job_title"}


class ContractService:
    """Handles contract generation, PDF creation, and amendment detection."""

    @staticmethod
    def _get_template_env():
        """Get Jinja2 template environment."""
        return Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True,
        )

    @staticmethod
    def _build_contract_data(contractor: dict, assignment: dict, client: dict) -> dict:
        """Build template variables from database records."""
        country = contractor.get("country", "NG")

        if country == "US":
            jurisdiction_law = "the laws of the State of Texas, United States of America"
            jurisdiction_venue = "the courts located in the State of Texas, USA"
        else:
            jurisdiction_law = "the laws of the Federal Republic of Nigeria"
            jurisdiction_venue = "arbitration in Lagos, Nigeria, in accordance with the Arbitration and Conciliation Act"

        return {
            # Company
            "company_name": "Dotfak Group LLC",
            "company_address": "Texas, United States of America",
            "company_representative": "Abraham Oladotun",
            "company_title": "Managing Director",

            # Contractor
            "contractor_name": f"{contractor['first_name']} {contractor['last_name']}",
            "contractor_address": ", ".join(
                p for p in [
                    contractor.get("address"),
                    contractor.get("city"),
                    contractor.get("state"),
                    contractor.get("zip_code"),
                ] if p
            ) or "Address on file",
            "contractor_country": country,
            "contractor_country_name": "United States of America" if country == "US" else "Nigeria",

            # Client
            "client_company_name": client.get("name", "Client Company"),

            # Assignment terms
            "start_date": assignment.get("start_date", ""),
            "rate_type": assignment.get("rate_type", "fixed"),
            "fixed_hourly_rate": assignment.get("fixed_hourly_rate"),
            "percentage_rate": assignment.get("percentage_rate"),
            "bonus_split_percentage": float(assignment.get("bonus_split_percentage", 50)),
            "company_bonus_percentage": 100 - float(assignment.get("bonus_split_percentage", 50)),

            # Role
            "job_title": assignment.get("job_title") or "the assigned role",

            # Jurisdiction
            "jurisdiction_law": jurisdiction_law,
            "jurisdiction_venue": jurisdiction_venue,

            # Metadata
            "contract_date": datetime.utcnow().strftime("%B %d, %Y"),
            "contract_year": datetime.utcnow().strftime("%Y"),
        }

    @staticmethod
    def generate_contract(contractor_id: str, assignment_id: str) -> dict:
        """
        Generate a contract from the template with assignment data.

        Returns the created contract record.
        """
        # Fetch contractor
        contractor_result = supabase_admin_client.table("contractors").select("*").eq(
            "id", contractor_id
        ).execute()
        if not contractor_result.data:
            raise Exception("Contractor not found")
        contractor = contractor_result.data[0]

        # Fetch assignment
        assignment_result = supabase_admin_client.table("contractor_assignments").select("*").eq(
            "id", assignment_id
        ).execute()
        if not assignment_result.data:
            raise Exception("Assignment not found")
        assignment = assignment_result.data[0]

        # Fetch client company
        client_result = supabase_admin_client.table("client_companies").select("*").eq(
            "id", assignment["client_company_id"]
        ).execute()
        if not client_result.data:
            raise Exception("Client company not found")
        client = client_result.data[0]

        # Build template data
        contract_data = ContractService._build_contract_data(contractor, assignment, client)

        # Render HTML
        env = ContractService._get_template_env()
        template = env.get_template("contract_template.html")
        html_content = template.render(**contract_data)

        # Check for existing active contract for this assignment
        existing = supabase_admin_client.table("contracts").select("id, version").eq(
            "assignment_id", assignment_id
        ).eq("contract_type", "original").neq("status", "voided").order(
            "version", desc=True
        ).limit(1).execute()

        version = 1
        if existing.data:
            # Supersede old contract
            supabase_admin_client.table("contracts").update({
                "status": "superseded"
            }).eq("id", existing.data[0]["id"]).execute()
            version = existing.data[0]["version"] + 1

        # Create contract record
        result = supabase_admin_client.table("contracts").insert({
            "contractor_id": contractor_id,
            "assignment_id": assignment_id,
            "contract_type": "original",
            "version": version,
            "status": "pending_contractor",
            "html_content": html_content,
            "contract_data": contract_data,
        }).execute()

        if not result.data:
            raise Exception("Failed to create contract")

        return result.data[0]

    @staticmethod
    def generate_manager_contract(manager_id: str, manager_assignment_id: str) -> dict:
        """
        Generate a contract for a manager assignment.

        Uses a separate template with manager-specific terms (flat rate, device management).
        Returns the created contract record.
        """
        # Fetch manager
        manager_result = supabase_admin_client.table("managers").select("*").eq(
            "id", manager_id
        ).execute()
        if not manager_result.data:
            raise Exception("Manager not found")
        manager = manager_result.data[0]

        # Fetch manager assignment
        ma_result = supabase_admin_client.table("manager_assignments").select("*").eq(
            "id", manager_assignment_id
        ).execute()
        if not ma_result.data:
            raise Exception("Manager assignment not found")
        ma = ma_result.data[0]

        # Fetch contractor assignment for contractor + client info
        ca_result = supabase_admin_client.table("contractor_assignments").select(
            "*, contractors(first_name, last_name), client_companies(name)"
        ).eq("id", ma["contractor_assignment_id"]).execute()
        if not ca_result.data:
            raise Exception("Contractor assignment not found")
        ca = ca_result.data[0]

        contractor_info = ca.get("contractors", {}) or {}
        client_info = ca.get("client_companies", {}) or {}

        # Build template data
        contract_data = {
            "company_name": "Dotfak Group LLC",
            "company_address": "Texas, United States of America",
            "company_representative": "Abraham Oladotun",
            "company_title": "Managing Director",
            "manager_name": f"{manager['first_name']} {manager['last_name']}",
            "manager_address": ", ".join(
                p for p in [
                    manager.get("address"),
                    manager.get("city"),
                    manager.get("state"),
                    manager.get("zip_code"),
                ] if p
            ) or "Address on file",
            "manager_country": manager.get("country", "NG"),
            "manager_country_name": "United States of America" if manager.get("country") == "US" else "Nigeria",
            "contractor_name": f"{contractor_info.get('first_name', '')} {contractor_info.get('last_name', '')}",
            "client_company_name": client_info.get("name", "Client Company"),
            "job_title": ca.get("job_title") or "the assigned role",
            "flat_hourly_rate": float(ma["flat_hourly_rate"]),
            "start_date": str(ma.get("start_date", "")),
            "jurisdiction_law": "the laws of the Federal Republic of Nigeria" if manager.get("country", "NG") != "US" else "the laws of the State of Texas, United States of America",
            "jurisdiction_venue": "arbitration in Lagos, Nigeria, in accordance with the Arbitration and Conciliation Act" if manager.get("country", "NG") != "US" else "the courts located in the State of Texas, USA",
            "contract_date": datetime.utcnow().strftime("%B %d, %Y"),
            "contract_year": datetime.utcnow().strftime("%Y"),
        }

        # Render HTML
        env = ContractService._get_template_env()
        template = env.get_template("manager_contract_template.html")
        html_content = template.render(**contract_data)

        # Check for existing contract for this manager assignment
        existing = supabase_admin_client.table("contracts").select("id, version").eq(
            "manager_id", manager_id
        ).eq("assignment_id", ma["contractor_assignment_id"]).neq(
            "status", "voided"
        ).order("version", desc=True).limit(1).execute()

        version = 1
        if existing.data:
            supabase_admin_client.table("contracts").update({
                "status": "superseded"
            }).eq("id", existing.data[0]["id"]).execute()
            version = existing.data[0]["version"] + 1

        # Create contract record
        result = supabase_admin_client.table("contracts").insert({
            "manager_id": manager_id,
            "contractor_id": None,
            "assignment_id": ma["contractor_assignment_id"],
            "contract_type": "original",
            "version": version,
            "status": "pending_contractor",
            "html_content": html_content,
            "contract_data": contract_data,
        }).execute()

        if not result.data:
            raise Exception("Failed to create manager contract")

        return result.data[0]

    @staticmethod
    def generate_amendment(parent_contract_id: str, assignment_id: str, changes: dict) -> dict:
        """
        Generate an amendment referencing the original contract.

        Args:
            parent_contract_id: ID of the original contract
            assignment_id: ID of the assignment
            changes: Dict of field_name -> {"old": old_val, "new": new_val}
        """
        # Fetch parent contract
        parent = supabase_admin_client.table("contracts").select("*").eq(
            "id", parent_contract_id
        ).execute()
        if not parent.data:
            raise Exception("Parent contract not found")
        parent_contract = parent.data[0]

        # Fetch fresh assignment data
        assignment_result = supabase_admin_client.table("contractor_assignments").select("*").eq(
            "id", assignment_id
        ).execute()
        assignment = assignment_result.data[0]

        # Fetch contractor
        contractor_result = supabase_admin_client.table("contractors").select("*").eq(
            "id", parent_contract["contractor_id"]
        ).execute()
        contractor = contractor_result.data[0]

        # Fetch client
        client_result = supabase_admin_client.table("client_companies").select("*").eq(
            "id", assignment["client_company_id"]
        ).execute()
        client = client_result.data[0]

        # Build amendment data
        contract_data = ContractService._build_contract_data(contractor, assignment, client)
        contract_data["parent_contract_date"] = parent_contract["created_at"]
        contract_data["changes"] = changes
        contract_data["amendment_date"] = datetime.utcnow().strftime("%B %d, %Y")

        # Render amendment HTML
        env = ContractService._get_template_env()
        template = env.get_template("contract_amendment.html")
        html_content = template.render(**contract_data)

        # Mark parent as superseded
        supabase_admin_client.table("contracts").update({
            "status": "superseded"
        }).eq("id", parent_contract_id).execute()

        # Create amendment record
        result = supabase_admin_client.table("contracts").insert({
            "contractor_id": parent_contract["contractor_id"],
            "assignment_id": assignment_id,
            "contract_type": "amendment",
            "version": parent_contract["version"] + 1,
            "parent_contract_id": parent_contract_id,
            "status": "pending_contractor",
            "html_content": html_content,
            "contract_data": contract_data,
        }).execute()

        if not result.data:
            raise Exception("Failed to create amendment")

        return result.data[0]

    @staticmethod
    def detect_material_changes(old_data: dict, new_data: dict) -> dict:
        """
        Compare old and new assignment data for material changes.

        Returns dict of changed fields with old/new values, or empty dict if no material changes.
        """
        changes = {}
        for field in MATERIAL_FIELDS:
            if field in new_data:
                old_val = old_data.get(field)
                new_val = new_data[field]
                # Compare as strings to handle numeric precision
                if str(old_val) != str(new_val):
                    changes[field] = {"old": old_val, "new": new_val}
        return changes

    @staticmethod
    def generate_pdf(contract_id: str) -> Optional[str]:
        """
        Generate PDF from contract HTML using WeasyPrint.

        Returns the PDF URL from Supabase Storage, or None if WeasyPrint not available.
        """
        try:
            from weasyprint import HTML
        except ImportError:
            logger.warning("WeasyPrint not installed. Skipping PDF generation.")
            return None

        # Fetch contract with signatures
        contract_result = supabase_admin_client.table("contracts").select("*").eq(
            "id", contract_id
        ).execute()
        if not contract_result.data:
            raise Exception("Contract not found")
        contract = contract_result.data[0]

        # Fetch signatures
        signatures_result = supabase_admin_client.table("contract_signatures").select("*").eq(
            "contract_id", contract_id
        ).execute()

        # Re-render HTML with signatures embedded
        html_content = contract["html_content"]

        # Inject signature images into HTML
        for sig in signatures_result.data or []:
            placeholder = f"<!-- SIGNATURE_{sig['signer_type'].upper()} -->"
            sig_html = f'<img src="{sig["signature_data"]}" style="max-height: 60px;" />'
            sig_html += f'<p style="margin: 4px 0; font-size: 12px;">{sig["signer_name"]}</p>'
            sig_html += f'<p style="margin: 4px 0; font-size: 11px; color: #666;">Signed: {sig["signed_at"]}</p>'
            html_content = html_content.replace(placeholder, sig_html)

        # Generate PDF
        pdf_bytes = HTML(string=html_content).write_pdf()

        # Upload to Supabase Storage
        storage_path = f"contracts/{contract_id}/contract_v{contract['version']}.pdf"
        try:
            supabase_admin_client.storage.from_("contracts").upload(
                storage_path,
                pdf_bytes,
                {"content-type": "application/pdf"},
            )
        except Exception as e:
            # Bucket may not exist yet - create it
            if "not found" in str(e).lower() or "bucket" in str(e).lower():
                try:
                    supabase_admin_client.storage.create_bucket("contracts", {"public": False})
                    supabase_admin_client.storage.from_("contracts").upload(
                        storage_path,
                        pdf_bytes,
                        {"content-type": "application/pdf"},
                    )
                except Exception as e2:
                    logger.error(f"Failed to create bucket and upload: {e2}")
                    return None
            else:
                logger.error(f"Failed to upload PDF: {e}")
                return None

        # Generate signed URL (1 year)
        signed = supabase_admin_client.storage.from_("contracts").create_signed_url(
            storage_path, 31536000
        )
        pdf_url = signed.get("signedURL") or signed.get("signedUrl", "")

        # Update contract record
        supabase_admin_client.table("contracts").update({
            "pdf_storage_path": storage_path,
            "pdf_url": pdf_url,
        }).eq("id", contract_id).execute()

        return pdf_url
