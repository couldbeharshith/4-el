"""
incidents.py — Incidents audit log store
Database operations for incident records.
"""

import logging
from typing import Any
import os
from supabase import create_client, Client

logger = logging.getLogger("INCIDENTS_STORE")

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def create_incident(
    incident_id: str,
    incident_type: str,
    location: str,
    title: str | None = None,
    severity: int = 5,
    summary: str | None = None,
) -> dict[str, Any]:
    """Create a new incident record in the audit log."""
    client = _get_client()

    data = {
        "incident_id": incident_id,
        "incident_type": incident_type,
        "location": location,
        "title": title,
        "severity": severity,
        "summary": summary,
        "status": "active",
    }

    try:
        result = client.table("incidents").insert(data).execute()
        logger.info(f"Created incident record: {incident_id}")
        return result.data[0] if result.data else None
    except Exception as e:
        # If incident already exists, just return it
        logger.warning(f"Incident creation failed (may already exist): {e}")
        existing = get_incident_by_id(incident_id)
        if existing:
            return existing
        raise


def get_incident_by_id(incident_id: str) -> dict[str, Any] | None:
    """Fetch an incident by its incident_id string."""
    client = _get_client()
    result = (
        client.table("incidents")
        .select("*")
        .eq("incident_id", incident_id)
        .single()
        .execute()
    )
    return result.data if result.data else None


def update_incident(incident_id: str, **updates) -> dict[str, Any]:
    """Update an incident record."""
    client = _get_client()
    result = (
        client.table("incidents")
        .update(updates)
        .eq("incident_id", incident_id)
        .execute()
    )
    logger.info(f"Updated incident: {incident_id}")
    return result.data[0] if result.data else None


def get_all_incidents() -> list[dict[str, Any]]:
    """Fetch all incident records."""
    client = _get_client()
    result = (
        client.table("incidents")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []
