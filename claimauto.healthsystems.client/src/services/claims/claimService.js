
import api from '../../api/axiosClient';

// ── GET ALL CLAIMS ────────────────────────────────────────────────────────────
// Backend:  GET /api/claims?status=&priority=
// Role-based: Hospital sees own | Policyholder sees own | Staff+Admin see all
// Returns:  ClaimResponseDto[]
export async function getAllClaims(status = null, priority = null) {
  const params = {};
  if (status)   params.status   = status;
  if (priority) params.priority = priority;
  const response = await api.get('/api/claims', { params });
  return response.data;
}

// ── GET CLAIM BY ID ───────────────────────────────────────────────────────────
// Backend:  GET /api/claims/{id}
// Returns:  ClaimDetailResponseDto (with lines, documents, adjudication)
export async function getClaimById(id) {
  const response = await api.get(`/api/claims/${id}`);
  return response.data;
}

// ── SUBMIT CLAIM ──────────────────────────────────────────────────────────────
// Backend:  POST /api/claims
// Hospital:     claimType = Inpatient | Outpatient | Pharmacy | Emergency
// Policyholder: claimType = Reimbursement
// Returns:  ClaimResponseDto (201 Created)
export async function submitClaim(dto) {
  const response = await api.post('/api/claims', dto);
  return response.data;
}

// ── UPDATE CLAIM ──────────────────────────────────────────────────────────────
// Backend:  PUT /api/claims/{id}
// Who:      Admin + InsuranceStaff only (enforced by backend)
// Accepts:  { status?, priority? }
// Returns:  ClaimResponseDto
export async function updateClaim(id, dto) {
  const response = await api.put(`/api/claims/${id}`, dto);
  return response.data;
}

// ── DELETE CLAIM ──────────────────────────────────────────────────────────────
// Backend:  DELETE /api/claims/{id}
// Who:      Admin only (enforced by backend)
// Rule:     Only Rejected claims can be deleted
// Returns:  string message
export async function deleteClaim(id) {
  const response = await api.delete(`/api/claims/${id}`);
  return response.data;
}

// ── ADD CLAIM LINE ────────────────────────────────────────────────────────────
// Backend:  POST /api/claims/{id}/lines
// Who:      Hospital (adds service lines after submitting)
// Returns:  ClaimLineResponseDto (201 Created)
export async function addClaimLine(claimId, dto) {
  const response = await api.post(`/api/claims/${claimId}/lines`, dto);
  return response.data;
}

// ── GET CLAIM LINES ───────────────────────────────────────────────────────────
// Backend:  GET /api/claims/{id}/lines
// Returns:  ClaimLineResponseDto[]
export async function getClaimLines(claimId) {
  const response = await api.get(`/api/claims/${claimId}/lines`);
  return response.data;
}

// ── UPLOAD DOCUMENT ───────────────────────────────────────────────────────────
// Backend:  POST /api/claims/{id}/documents
// Who:      All roles (Admin, Staff, Hospital, Policyholder)
// Accepts:  { docType, fileURI, sha256 }
// Returns:  ClaimDocumentResponseDto (201 Created)
// NOTE:     In production, file goes to S3/Azure first → then store URI here.
//           For this project we simulate the URI.
// ── UPLOAD DOCUMENT (multipart) ───────────────────────────────────────
// Backend: POST /api/claims/{id}/documents (multipart/form-data)
export async function uploadDocument(claimId, file, docType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    const response = await api.post(`/api/claims/${claimId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

// ── VIEW DOCUMENT INLINE ──────────────────────────────────────────────
export async function viewClaimDocument(claimId, docId) {
    const res = await api.get(`/api/claims/${claimId}/documents/${docId}/view`, {
        responseType: 'blob',
    });
    const contentType = res.headers['content-type'] || 'application/octet-stream';
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const newTab = window.open(url, '_blank');
    if (!newTab) window.location.href = url;
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
}

// ── DOWNLOAD DOCUMENT ─────────────────────────────────────────────────
export async function downloadClaimDocument(claimId, docId, fileName) {
    const res = await api.get(`/api/claims/${claimId}/documents/${docId}/download`, {
        responseType: 'blob',
    });
    const contentType = res.headers['content-type'] || 'application/octet-stream';
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `claim-${claimId}-doc-${docId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// ── GET CLAIM DOCUMENTS ───────────────────────────────────────────────────────
// Backend:  GET /api/claims/{id}/documents
// Returns:  ClaimDocumentResponseDto[]
export async function getClaimDocuments(claimId) {
  const response = await api.get(`/api/claims/${claimId}/documents`);
  return response.data;
}

export async function deleteDocument(claimId, docId) {
  const response = await api.delete(`/api/claims/${claimId}/documents/${docId}`);
  return response.data;
}

export async function verifyDocument(claimId, docId, status) {
  const response = await api.put(
    `/api/claims/${claimId}/documents/${docId}/verify`,
    { status }
  );
  return response.data;
}

// ── PROCEED TO ADJUDICATION ───────────────────────────────────────────────────
// Backend:  POST /api/claims/{id}/proceed-to-adjudication
// Who:      Admin + InsuranceStaff only (enforced by backend)
// Pre-condition: claim is DocsVerificationPending AND all docs are Verified or Rejected
// Effect:   runs fraud scoring → if clean, runs auto-adjudication
// Returns:  { claimID, fraudDetected, autoAdjudicated, adjudication?, message }
// Future:   AI verification service calls this endpoint automatically — no frontend change needed
export async function proceedToAdjudication(claimId) {
  const response = await api.post(`/api/claims/${claimId}/proceed-to-adjudication`);
  return response.data;
}