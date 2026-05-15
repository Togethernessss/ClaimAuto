import api from '../../api/axiosClient';

// ── GET ALL MEMBERS ───────────────────────────────────────────────────────
// Backend:  GET /api/members
// Filters:  ?policyId=1  ?status=Active
// Who uses: Admin, InsuranceStaff

export async function getAllMembers(policyId = null, status = null) {
  const params = {};
  if (policyId) params.policyId = policyId;
  if (status)   params.status   = status;

  const response = await api.get('/api/members', { params });
  return response.data;
}

// ── GET ONE MEMBER ────────────────────────────────────────────────────────
// Backend:  GET /api/members/{id}
// Who uses: Admin, InsuranceStaff, Hospital

export async function getMemberById(id) {
  const response = await api.get(`/api/members/${id}`);
  return response.data;
}

// ── CHECK ELIGIBILITY ─────────────────────────────────────────────────────
// Backend:  GET /api/members/{id}/eligibility
// Returns:  eligibility status, remaining benefit, deductible met
// Has TTL-based caching — returns cached result within 300 seconds
// Who uses: Admin, InsuranceStaff, Hospital

export async function checkEligibility(id) {
  const response = await api.get(`/api/members/${id}/eligibility`);
  return response.data;
}

// ── CREATE MEMBER ─────────────────────────────────────────────────────────
// Backend:  POST /api/members
// Accepts:  CreateMemberDto shape
// Who uses: Admin, InsuranceStaff

export async function createMember(dto) {
  const response = await api.post('/api/members', dto);
  return response.data;
}

// ── UPDATE MEMBER ─────────────────────────────────────────────────────────
// Backend:  PUT /api/members/{id}
// Accepts:  UpdateMemberDto shape
// Locked:   DOB, Gender, PolicyID cannot be changed
// Who uses: Admin, InsuranceStaff

export async function updateMember(id, dto) {
  const response = await api.put(`/api/members/${id}`, dto);
  return response.data;
}

// POST /api/members/check-expired
// Auto-expires members whose CoverageEnd date has passed
// Should look exactly like this at the bottom:
export async function checkExpiredMembers() {
  const response = await api.post('/api/members/check-expired');
  return response.data;
}