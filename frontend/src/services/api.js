/*
  BACKEND INTEGRATION WITH DEMO MODE
  ──────────────────────────────────
  Config from .env.local:
  - VITE_API_BASE_URL: Backend API URL
  - VITE_DEMO_MODE: Toggle between mock and real API
  - VITE_POLL_INTERVAL_MS: Poll interval for real API

  Endpoints:
  GET  /need-cards              → getAllNeedCards()
  POST /need-cards/decision     → submitDecision(id, approved)
  POST /need-cards/take-up      → takeUpNeedCard(id, name, phone, email)
  POST /incident/new            → createIncident(name)
*/

import { NEED_CARDS } from '../data/needCards';
import { INCIDENTS } from '../data/incidents';
import { ACTIVITY_FEED } from '../data/activityFeed';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// In-memory state for mock API
let currentNeedCards = [...NEED_CARDS];
let currentIncidents = [...INCIDENTS];
let currentActivityFeed = [...ACTIVITY_FEED];

// Helper to simulate network delay
const delay = (min = 400, max = 800) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Normalize card: convert qty to quantity for FE consistency
const normalizeCard = (card) => ({
  ...card,
  quantity: card.qty || card.quantity,
  tool_name: card.type === 'food' ? 'send_food' : card.type === 'meds' ? 'send_meds' : card.type === 'water' ? 'send_water' : card.type === 'rescue_team' ? 'send_rescue_team' : 'reserve_resource'
});

// ── MOCK API ──────────────────────────────────────────────────────────────

const mockApi = {
  async getPublicNeedCards() {
    await delay();
    const data = currentNeedCards.filter(
      card => card.show_pd === true && card.fulfilled === false
    );
    return { data, error: null };
  },

  async getPendingApprovalCards() {
    await delay();
    const data = currentNeedCards.filter(
      card => card.pending_approval === true && card.show_pd === false && card.fulfilled === false
    );
    return { data, error: null };
  },

  async getAllNeedCards() {
    await delay();
    return { data: currentNeedCards, error: null };
  },

  async submitDecision(needCardId, approved) {
    await delay();
    const index = currentNeedCards.findIndex(card => card.id === needCardId);
    if (index === -1) {
      return { data: null, error: "Need card not found" };
    }

    const updatedCard = { ...currentNeedCards[index] };
    if (approved) {
      updatedCard.show_pd = true;
      updatedCard.pending_approval = false;
    } else {
      updatedCard.pending_approval = false;
      updatedCard.show_pd = false;
    }

    currentNeedCards[index] = updatedCard;
    currentActivityFeed.unshift({
      id: `log_${Date.now()}`,
      type: "admin",
      message: `Admin ${approved ? 'approved' : 'rejected'} need card: ${updatedCard.item}`,
      timestamp: new Date().toISOString()
    });

    return { data: updatedCard, error: null };
  },

  async takeUpNeedCard(id, name, phone, email) {
    await delay();
    const index = currentNeedCards.findIndex(card => card.id === id);
    if (index === -1) {
      return { data: null, error: "Need card not found" };
    }

    const updatedCard = { ...currentNeedCards[index] };
    updatedCard.done_by = name;
    currentNeedCards[index] = updatedCard;

    currentActivityFeed.unshift({
      id: `log_${Date.now()}`,
      type: "volunteer",
      message: `${name} took up: ${updatedCard.item}`,
      timestamp: new Date().toISOString()
    });

    return { 
      data: { success: true, need_card_id: id, assigned_to: name }, 
      error: null 
    };
  },

  async createIncident(incidentName) {
    await delay(8500, 8500);
    const newIncident = {
      incident_id: `inc_${Date.now()}`,
      name: incidentName,
      status: "verifying"
    };

    currentActivityFeed.unshift({
      id: `log_${Date.now()}`,
      type: "system",
      message: `New incident registered: ${incidentName} (${newIncident.incident_id})`,
      timestamp: new Date().toISOString()
    });

    return { data: newIncident, error: null };
  },

  async getActivityFeed() {
    await delay();
    const data = [...currentActivityFeed].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return { data, error: null };
  }
};

// ── REAL API ──────────────────────────────────────────────────────────────

const realApi = {
  async getPublicNeedCards() {
    try {
      const res = await fetch(`${API_BASE_URL}/need-cards`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      return { data: data.map(normalizeCard), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getPendingApprovalCards() {
    try {
      const res = await fetch(`${API_BASE_URL}/need-cards`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const allCards = await res.json();
      const data = allCards.filter(
        card => card.pending_approval === true && card.show_pd === false && card.fulfilled === false
      );
      return { data: data.map(normalizeCard), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getAllNeedCards() {
    try {
      const res = await fetch(`${API_BASE_URL}/need-cards`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      return { data: data.map(normalizeCard), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async submitDecision(needCardId, approved) {
    try {
      const res = await fetch(`${API_BASE_URL}/need-cards/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ need_card_id: needCardId, approved })
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const result = await res.json();
      return { data: normalizeCard(result.card), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async takeUpNeedCard(id, name, phone, email) {
    try {
      const res = await fetch(`${API_BASE_URL}/need-cards/take-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, ph_num: phone, email })
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const result = await res.json();
      return { data: normalizeCard(result.card), error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async createIncident(incidentName) {
    try {
      const res = await fetch(`${API_BASE_URL}/incident/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'incident-name': incidentName })
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const result = await res.json();
      return { data: result.verified_incident, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getActivityFeed() {
    // Activity feed is not exposed by backend, return empty
    return { data: [], error: null };
  }
};

// ── EXPORT ────────────────────────────────────────────────────────────────

const _api = DEMO_MODE ? { ...mockApi } : { ...realApi };

export const api = _api;

// ── DEMO MODE TOGGLE ──────────────────────────────────────────────────────

export const setDemoMode = (enabled) => {
  const newImpl = enabled ? mockApi : realApi;
  Object.assign(api, newImpl);
};

export const isDemoMode = () => DEMO_MODE;
