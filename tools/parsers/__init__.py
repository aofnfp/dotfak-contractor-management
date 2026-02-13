"""
Paystub parsers for different organizations.

Each organization has its own parser module that implements
organization-specific regex patterns for data extraction.
"""

from pathlib import Path

# Available parsers
AVAILABLE_PARSERS = {
    "ap_account_services": "ap_account_services_parser",
    "bc_forward": "adp_parser",
    "iqor": "adp_parser",
    "connexus": "connexus_parser",
    "everise": "everise_parser",
}


def get_parser(organization: str):
    """
    Get parser module for specified organization.

    Args:
        organization: Organization identifier (e.g., "ap_account_services")

    Returns:
        Parser module

    Raises:
        ValueError: If organization parser not found
    """
    if organization not in AVAILABLE_PARSERS:
        available = ", ".join(AVAILABLE_PARSERS.keys())
        raise ValueError(
            f"Parser for '{organization}' not found. "
            f"Available parsers: {available}"
        )

    module_name = AVAILABLE_PARSERS[organization]
    module = __import__(f"parsers.{module_name}", fromlist=[module_name])

    return module
