// src/services/adjudication/adjudicationService.js
import api from '../../api/axiosClient';

// ── AUTO ADJUDICATE ───────────────────────────────────────────────────────────
// Backend:  POST /api/adjudication/auto/{claimId}
// Runs the engine against active rules
// Returns:  AdjudicationResponseDto | { message, adjudication } for PendingReview
export async function autoAdjudicate(claimId) {
  const res = await api.post(`/api/adjudication/auto/${claimId}`);
  return res.data;
}

// ── MANUAL ADJUDICATE ─────────────────────────────────────────────────────────
// Backend:  POST /api/adjudication/manual
// Staff/Admin manually decides: Paid | Denied | Partial
// Notes are required
// Returns:  AdjudicationResponseDto
export async function manualAdjudicate(dto) {
  const res = await api.post('/api/adjudication/manual', dto);
  return res.data;
}

// ── GET ADJUDICATION RECORD ───────────────────────────────────────────────────
// Backend:  GET /api/adjudication/{claimId}
// Returns:  AdjudicationResponseDto | null
export async function getAdjudication(claimId) {
  const res = await api.get(`/api/adjudication/${claimId}`);
  return res.data;
}

// ── GET RULE TRACE ────────────────────────────────────────────────────────────
// Backend:  GET /api/adjudication/{claimId}/trace
// Returns:  RuleTraceDto[] — which rules fired and their results
export async function getRuleTrace(claimId) {
  const res = await api.get(`/api/adjudication/${claimId}/trace`);
  return res.data;
}