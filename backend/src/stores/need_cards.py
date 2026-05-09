"""
need_cards.py — Need-cards store
Database operations for need-cards (resource allocation tracking).
"""

import logging
from typing import Any
import os
from supabase import create_client, Client

logger = logging.getLogger("NEED_CARDS_STORE")

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def create_need_card(
    incident_id: str,
    card_type: str,
    item: str,
    qty: float,
    explanation: str,
    note: str | None = None,
    fulfilled: bool = False,
    done_by: str | None = None,
    pending_approval: bool = False,
) -> dict[str, Any]:
    """Create a new need-card in the database."""
    client = _get_client()

    # First get the incidents UUID from incident_id string
    incident = client.table("incidents").select("id").eq("incident_id", incident_id).execute()
    if not incident.data:
        logger.error(f"Incident not found: {incident_id}")
        raise ValueError(f"Incident not found: {incident_id}")

    incident_uuid = incident.data[0]["id"]

    data = {
        "incident_id": incident_uuid,
        "type": card_type,
        "item": item,
        "qty": qty,
        "note": note,
        "explanation": explanation,
        "done_by": done_by,
        "fulfilled": fulfilled,
        "pending_approval": pending_approval,
        "show_pd": not pending_approval,  # Only show on PD if not pending approval
    }

    result = client.table("need_cards").insert(data).execute()
    logger.info(f"Created need-card: {card_type} × {qty} for incident {incident_id}")
    return result.data[0] if result.data else None


def get_all_need_cards() -> list[dict[str, Any]]:
    """Fetch all need-cards with incident details."""
    client = _get_client()
    result = (
        client.table("need_cards")
        .select("*, incidents(incident_id, location)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_need_cards_by_incident(incident_id: str) -> list[dict[str, Any]]:
    """Fetch need-cards for a specific incident."""
    client = _get_client()

    incident = client.table("incidents").select("id").eq("incident_id", incident_id).execute()
    if not incident.data:
        return []

    incident_uuid = incident.data[0]["id"]
    result = (
        client.table("need_cards")
        .select("*")
        .eq("incident_id", incident_uuid)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def approve_need_card(card_id: str) -> dict[str, Any]:
    """Admin approves a need-card (sets pending_approval=false, show_pd=true)."""
    client = _get_client()
    result = (
        client.table("need_cards")
        .update({"pending_approval": False, "show_pd": True})
        .eq("id", card_id)
        .execute()
    )
    logger.info(f"Approved need-card: {card_id}")
    return result.data[0] if result.data else None


def reject_need_card(card_id: str) -> dict[str, Any]:
    """Admin rejects a need-card (sets show_pd=false)."""
    client = _get_client()
    result = (
        client.table("need_cards")
        .update({"pending_approval": False, "show_pd": False})
        .eq("id", card_id)
        .execute()
    )
    logger.info(f"Rejected need-card: {card_id}")
    return result.data[0] if result.data else None


def take_up_need_card(card_id: str, volunteer_name: str) -> dict[str, Any]:
    """Volunteer takes up a need-card (fulfills it)."""
    client = _get_client()
    result = (
        client.table("need_cards")
        .update({"fulfilled": True, "done_by": volunteer_name})
        .eq("id", card_id)
        .execute()
    )
    logger.info(f"Need-card {card_id} taken up by {volunteer_name}")
    return result.data[0] if result.data else None
