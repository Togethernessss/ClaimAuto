// src/services/rules/ruleService.js
import api from '../../api/axiosClient';

// ── GET ALL RULES ─────────────────────────────────────────────────────────────
// Backend:  GET /api/rules?status=&ruleType=
// Returns:  RuleResponseDto[] ordered by priority
export async function getAllRules(status = null, ruleType = null) {
  const params = {};
  if (status)   params.status   = status;
  if (ruleType) params.ruleType = ruleType;
  const res = await api.get('/api/rules', { params });
  return res.data;
}

// ── GET RULE BY ID ────────────────────────────────────────────────────────────
// Backend:  GET /api/rules/{id}
// Returns:  RuleResponseDto | null
export async function getRuleById(id) {
  const res = await api.get(`/api/rules/${id}`);
  return res.data;
}

// ── CREATE RULE ───────────────────────────────────────────────────────────────
// Backend:  POST /api/rules
// Creates rule in Draft status
// Returns:  RuleResponseDto (201)
export async function createRule(dto) {
  const res = await api.post('/api/rules', dto);
  return res.data;
}

// ── UPDATE RULE ───────────────────────────────────────────────────────────────
// Backend:  PUT /api/rules/{id}
// Bumps version on change
// Returns:  RuleResponseDto
export async function updateRule(id, dto) {
  const res = await api.put(`/api/rules/${id}`, dto);
  return res.data;
}

// ── ACTIVATE RULE ─────────────────────────────────────────────────────────────
// Backend:  PUT /api/rules/{id}/activate
// Draft → Active (engine will use it)
// Returns:  string message
export async function activateRule(id) {
  const res = await api.put(`/api/rules/${id}/activate`);
  return res.data;
}

// ── DEACTIVATE RULE ───────────────────────────────────────────────────────────
// Backend:  PUT /api/rules/{id}/deactivate
// Active → Inactive (engine stops using it)
// Returns:  string message
export async function deactivateRule(id) {
  const res = await api.put(`/api/rules/${id}/deactivate`);
  return res.data;
}

// ── DELETE RULE ───────────────────────────────────────────────────────────────
// Backend:  DELETE /api/rules/{id}
// Draft only — permanent deletion
// Returns:  string message
export async function deleteRule(id) {
  const res = await api.delete(`/api/rules/${id}`);
  return res.data;
}