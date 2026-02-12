"""
Batch enrichment utilities to eliminate N+1 query patterns.

Instead of querying related entities per-row in a loop, these functions:
1. Collect all unique foreign key IDs from a result set
2. Batch-fetch related entities in single queries using .in_()
3. Build lookup dictionaries keyed by ID
4. Map enriched data back to each row
"""

from typing import List, Dict
import logging

from backend.config import supabase_admin_client

logger = logging.getLogger(__name__)


def _batch_fetch(table: str, ids: List[str], select: str = "*", key: str = "id") -> Dict[str, dict]:
    """Fetch rows from table where key IN ids, return dict keyed by key."""
    if not ids:
        return {}
    unique_ids = list(set(str(i) for i in ids if i))
    if not unique_ids:
        return {}
    result = supabase_admin_client.table(table).select(select).in_(key, unique_ids).execute()
    return {str(row[key]): row for row in (result.data or [])}


def enrich_earnings(earnings: List[dict]) -> List[dict]:
    """Batch-enrich contractor_earnings with contractor, client, and paystub details."""
    if not earnings:
        return []

    assignment_ids = [e['contractor_assignment_id'] for e in earnings if e.get('contractor_assignment_id')]
    paystub_ids = [e['paystub_id'] for e in earnings if e.get('paystub_id')]

    assignments = _batch_fetch("contractor_assignments", assignment_ids, "id, contractor_id, client_company_id")

    contractor_ids = [a['contractor_id'] for a in assignments.values()]
    client_ids = [a['client_company_id'] for a in assignments.values()]

    contractors = _batch_fetch("contractors", contractor_ids, "id, first_name, last_name, contractor_code")
    clients = _batch_fetch("client_companies", client_ids, "id, name, code")
    paystubs = _batch_fetch("paystubs", paystub_ids, "id, file_name, check_date")

    enriched = []
    for earning in earnings:
        row = dict(earning)
        a = assignments.get(str(earning.get('contractor_assignment_id', '')))
        if a:
            row['contractor_id'] = a['contractor_id']
            c = contractors.get(str(a['contractor_id']))
            if c:
                row['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                row['contractor_code'] = c['contractor_code']
            cl = clients.get(str(a['client_company_id']))
            if cl:
                row['client_name'] = cl['name']
                row['client_code'] = cl['code']

        p = paystubs.get(str(earning.get('paystub_id', '')))
        if p:
            row['paystub_file_name'] = p.get('file_name')
            row['paystub_check_date'] = p.get('check_date')

        enriched.append(row)
    return enriched


def enrich_assignments(assignments_list: List[dict]) -> List[dict]:
    """Batch-enrich contractor_assignments with contractor and client details."""
    if not assignments_list:
        return []

    contractor_ids = [a['contractor_id'] for a in assignments_list if a.get('contractor_id')]
    client_ids = [a['client_company_id'] for a in assignments_list if a.get('client_company_id')]

    contractors = _batch_fetch("contractors", contractor_ids, "id, first_name, last_name, contractor_code")
    clients = _batch_fetch("client_companies", client_ids, "id, name, code")

    for assignment in assignments_list:
        c = contractors.get(str(assignment.get('contractor_id', '')))
        if c:
            assignment['contractor_name'] = f"{c['first_name']} {c['last_name']}"
            assignment['contractor_code'] = c['contractor_code']
        cl = clients.get(str(assignment.get('client_company_id', '')))
        if cl:
            assignment['client_name'] = cl['name']
            assignment['client_code'] = cl['code']

    return assignments_list


def enrich_paystubs(paystubs_list: List[dict]) -> List[dict]:
    """Batch-enrich paystubs with contractor and client details."""
    if not paystubs_list:
        return []

    assignment_ids = [p['contractor_assignment_id'] for p in paystubs_list if p.get('contractor_assignment_id')]
    client_ids = [p['client_company_id'] for p in paystubs_list if p.get('client_company_id')]

    assignments = _batch_fetch("contractor_assignments", assignment_ids, "id, contractor_id")
    contractor_ids = [a['contractor_id'] for a in assignments.values()]
    contractors = _batch_fetch("contractors", contractor_ids, "id, first_name, last_name, contractor_code")
    clients = _batch_fetch("client_companies", client_ids, "id, name, code")

    for paystub in paystubs_list:
        a = assignments.get(str(paystub.get('contractor_assignment_id', '')))
        if a:
            c = contractors.get(str(a['contractor_id']))
            if c:
                paystub['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                paystub['contractor_code'] = c['contractor_code']
            else:
                paystub.setdefault('contractor_name', None)
                paystub.setdefault('contractor_code', None)
        else:
            paystub.setdefault('contractor_name', None)
            paystub.setdefault('contractor_code', None)

        cl = clients.get(str(paystub.get('client_company_id', '')))
        if cl:
            paystub['client_name'] = cl['name']
            paystub['client_code'] = cl['code']
        else:
            paystub.setdefault('client_name', None)
            paystub.setdefault('client_code', None)

    return paystubs_list


def enrich_manager_earnings(earnings: List[dict]) -> List[dict]:
    """Batch-enrich manager_earnings with manager, contractor, and client details."""
    if not earnings:
        return []

    manager_ids = [e['manager_id'] for e in earnings if e.get('manager_id')]
    assignment_ids = [e['contractor_assignment_id'] for e in earnings if e.get('contractor_assignment_id')]

    managers = _batch_fetch("managers", manager_ids, "id, first_name, last_name")
    assignments = _batch_fetch("contractor_assignments", assignment_ids, "id, contractor_id, client_company_id")

    contractor_ids = [a['contractor_id'] for a in assignments.values()]
    client_ids = [a['client_company_id'] for a in assignments.values()]

    contractors = _batch_fetch("contractors", contractor_ids, "id, first_name, last_name")
    clients = _batch_fetch("client_companies", client_ids, "id, name")

    for earning in earnings:
        m = managers.get(str(earning.get('manager_id', '')))
        if m:
            earning['manager_name'] = f"{m['first_name']} {m['last_name']}"

        a = assignments.get(str(earning.get('contractor_assignment_id', '')))
        if a:
            c = contractors.get(str(a['contractor_id']))
            if c:
                earning['contractor_name'] = f"{c['first_name']} {c['last_name']}"
            cl = clients.get(str(a['client_company_id']))
            if cl:
                earning['client_name'] = cl['name']

    return earnings


def enrich_manager_assignments(assignments_list: List[dict]) -> List[dict]:
    """Batch-enrich manager_assignments with manager, contractor, and client details."""
    if not assignments_list:
        return []

    manager_ids = [a['manager_id'] for a in assignments_list if a.get('manager_id')]
    ca_ids = [a['contractor_assignment_id'] for a in assignments_list if a.get('contractor_assignment_id')]

    managers = _batch_fetch("managers", manager_ids, "id, first_name, last_name")
    ca_lookup = _batch_fetch("contractor_assignments", ca_ids, "id, contractor_id, client_company_id")

    contractor_ids = [a['contractor_id'] for a in ca_lookup.values()]
    client_ids = [a['client_company_id'] for a in ca_lookup.values()]

    contractors = _batch_fetch("contractors", contractor_ids, "id, first_name, last_name, contractor_code")
    clients = _batch_fetch("client_companies", client_ids, "id, name")

    for assignment in assignments_list:
        m = managers.get(str(assignment.get('manager_id', '')))
        if m:
            assignment['manager_name'] = f"{m['first_name']} {m['last_name']}"

        ca = ca_lookup.get(str(assignment.get('contractor_assignment_id', '')))
        if ca:
            c = contractors.get(str(ca['contractor_id']))
            if c:
                assignment['contractor_name'] = f"{c['first_name']} {c['last_name']}"
                assignment['contractor_code'] = c.get('contractor_code')
            cl = clients.get(str(ca['client_company_id']))
            if cl:
                assignment['client_name'] = cl['name']

    return assignments_list
