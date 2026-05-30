import api from '../../api/axiosClient';

// ── GET ALL MEMBERS ───────────────────────────────────────────────────────
// Backend:  GET /api/members
// Filters:  ?policyId=1  ?status=Active
// Who uses: Admin, InsuranceStaff, Policyholder (role-scoped by API)

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

// ── GET MY MEMBER (Policyholder only) ─────────────────────────────
// Backend:  GET /api/members/my
// Returns:  The single member record linked to the current Policyholder user
// Returns 404 if the user hasn't been enrolled by staff yet

export async function getMyMember() {
  const response = await api.get('/api/members/my');
  return response.data;
}

// ── LOOKUP MEMBER BY NUMBER (Hospital claim submission) ───────────────────
// Backend:  GET /api/members/lookup?memberNumber=MEM-000042
// Returns:  Single member with policyID + policyName included
// Who uses: Hospital — finds a patient before submitting a claim
export async function lookupMemberByNumber(memberNumber) {
  const response = await api.get('/api/members/lookup', {
    params: { memberNumber },
  });
  return response.data;
}

// Backend:  GET /api/members
// Returns:  Every enrollment linked to the current Policyholder user
export async function getMyMemberEnrollments() {
  const response = await api.get('/api/members');
  return response.data;
}

// Backend:  GET /api/members/lookup-all?memberNumber=MEM-000042
// Returns:  Every enrollment sharing the same member card number
export async function lookupMemberEnrollmentsByNumber(memberNumber) {
  const response = await api.get('/api/members/lookup-all', {
    params: { memberNumber },
  });
  return response.data;
}
