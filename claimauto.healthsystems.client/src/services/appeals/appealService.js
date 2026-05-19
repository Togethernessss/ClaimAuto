import api from '../../api/axiosClient';

// ── GET ALL APPEALS ──────────────────────────────────────────────────────────
// Backend:  GET /api/appeals
// Role-based filtering applied on backend:
//   • Admin/Staff   → see all appeals
//   • Policyholder  → see only their own (FiledBy == logged-in UserID)
//   • Hospital      → see only appeals they filed
// Returns: AppealResponseDto[]
export async function getAllAppeals() {
  const res = await api.get('/api/appeals');
  return res.data;
}

// ── GET ONE APPEAL ───────────────────────────────────────────────────────────
// Backend: GET /api/appeals/{id}
// 403 if non-staff user tries to read someone else's appeal.
export async function getAppealById(id) {
  const res = await api.get(`/api/appeals/${id}`);
  return res.data;
}

// ── FILE A NEW APPEAL ────────────────────────────────────────────────────────
// Backend: POST /api/appeals
// Body:    { claimID, reason, documentsJSON? }
// Rules:   claim must be Rejected or Adjudicated; no active appeal already exists.
export async function fileAppeal(dto) {
  const res = await api.post('/api/appeals', dto);
  return res.data;
}

// ── WITHDRAW MY APPEAL ───────────────────────────────────────────────────────
// Backend: PUT /api/appeals/{id}/withdraw
// Only the filer can withdraw, and only while Filed or UnderReview.
export async function withdrawAppeal(id) {
  const res = await api.put(`/api/appeals/${id}/withdraw`);
  return res.data;
}

// ── DECIDE AN APPEAL — Admin/Staff only ──────────────────────────────────────
// Backend: PUT /api/appeals/{id}/decide
// Body:    { outcome }  — "Upheld" | "Overturned" | "PartiallyUpheld"
export async function decideAppeal(id, outcome) {
  const res = await api.put(`/api/appeals/${id}/decide`, { outcome });
  return res.data;
}