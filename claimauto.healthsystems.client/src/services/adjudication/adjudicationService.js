import api from '../../api/axiosClient';

// ── MANUAL ADJUDICATION ───────────────────────────────────────────────────────
// Backend:  POST /api/adjudication/manual
// Who:      Admin + InsuranceStaff only
// Body:     { claimID, decision, payableAmount?, notes, calculationsJSON? }
// Decision: "Paid" | "Partial" | "Denied"
//   Paid    → claim becomes Approved, full payment record created
//   Partial → claim becomes Approved, partial payment record created
//   Denied  → claim becomes Rejected
// Notes are REQUIRED — backend rejects without them.
export async function manualAdjudicate(dto) {
  const response = await api.post('/api/adjudication/manual', dto);
  return response.data;
}

// ── GET ADJUDICATION RECORD ───────────────────────────────────────────────────
// Backend:  GET /api/adjudication/{claimId}
// Who:      Admin + InsuranceStaff only
export async function getAdjudication(claimId) {
  const response = await api.get(`/api/adjudication/${claimId}`);
  return response.data;
}

// ── GET RULE TRACE ────────────────────────────────────────────────────────────
// Backend:  GET /api/adjudication/{claimId}/trace
// Who:      Admin + InsuranceStaff only
// Returns:  The rule trace showing which adjudication rules fired on a claim.
export async function getRuleTrace(claimId) {
  const response = await api.get(`/api/adjudication/${claimId}/trace`);
  return response.data;
}
