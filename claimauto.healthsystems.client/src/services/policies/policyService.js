import api from '../../api/axiosClient';

// ── GET ALL POLICIES ──────────────────────────────────────────────────────────
// Backend:  GET /api/policies
// Returns:  All policies (Active, Expired, Suspended)
// Who uses: Admin list page, InsuranceStaff list page

export async function getAllPolicies() {
  const response = await api.get('/api/policies');
  return response.data;
}


// ── GET ACTIVE POLICIES ONLY ──────────────────────────────────────────────────
// Backend:  GET /api/policies/active
// Returns:  Only currently active policies (within effective date range)
// Who uses: Hospital — dropdown when submitting a claim

export async function getActivePolicies() {
  const response = await api.get('/api/policies/active');
  return response.data;
}


// ── GET ONE POLICY BY ID ──────────────────────────────────────────────────────
// Backend:  GET /api/policies/{id}
// Returns:  Single policy with memberCount
// Who uses: Policy detail view

export async function getPolicyById(id) {
  const response = await api.get(`/api/policies/${id}`);
  return response.data;
}


// ── CREATE POLICY ─────────────────────────────────────────────────────────────
// Backend:  POST /api/policies
// Accepts:  CreatePolicyDto shape
// Who uses: Admin only

export async function createPolicy(dto) {
  const response = await api.post('/api/policies', dto);
  return response.data;
}


// ── UPDATE POLICY ─────────────────────────────────────────────────────────────
// Backend:  PUT /api/policies/{id}
// Accepts:  UpdatePolicyDto shape (planCode + effectiveFrom excluded)
// Who uses: Admin only

export async function updatePolicy(id, dto) {
  const response = await api.put(`/api/policies/${id}`, dto);
  return response.data;
}


// ── DEACTIVATE POLICY (Soft Delete) ──────────────────────────────────────────
// Backend:  DELETE /api/policies/{id}
// Does NOT remove from DB — sets Status = Expired
// Blocked if policy has active members enrolled
// Who uses: Admin only

export async function deactivatePolicy(id) {
  const response = await api.delete(`/api/policies/${id}`);
  return response.data;
}


// POST /api/policies/check-expired
// Called when Admin logs in — auto-expires overdue policies
// and sends notifications. Admin only.
export async function checkExpiredPolicies() {
  const response = await api.post('/api/policies/check-expired');
  return response.data;
}