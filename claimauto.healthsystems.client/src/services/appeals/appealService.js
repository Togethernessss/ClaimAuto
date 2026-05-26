import api from '../../api/axiosClient';

// ── GET ALL APPEALS ──────────────────────────────────────────────────────────
export async function getAllAppeals() {
  const res = await api.get('/api/appeals');
  return res.data;
}

// ── GET ONE APPEAL ───────────────────────────────────────────────────────────
export async function getAppealById(id) {
  const res = await api.get(`/api/appeals/${id}`);
  return res.data;
}

// ── FILE A NEW APPEAL (multipart with file uploads) ─────────────────────────
export async function fileAppeal(dto) {
  const formData = new FormData();
  formData.append('claimID', dto.claimID);
  formData.append('reason', dto.reason);

  if (dto.files && dto.files.length > 0) {
    for (let i = 0; i < dto.files.length; i++) {
      formData.append('files', dto.files[i]);
    }
  }

  const res = await api.post('/api/appeals', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── WITHDRAW MY APPEAL ───────────────────────────────────────────────────────
export async function withdrawAppeal(id) {
  const res = await api.put(`/api/appeals/${id}/withdraw`);
  return res.data;
}

// ── DECIDE AN APPEAL — Admin / InsuranceStaff only ──────────────────────────
export async function decideAppeal(id, outcome) {
  const res = await api.put(`/api/appeals/${id}/decide`, { outcome });
  return res.data;
}

// ── VIEW COMPILED PDF (merged) — opens in new tab ───────────────────────────
export async function viewAppealPdf(appealId) {
  const res = await api.get(`/api/appeals/${appealId}/pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const newTab = window.open(url, '_blank');
  if (!newTab) window.location.href = url;
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
}

// ── DOWNLOAD COMPILED PDF (merged) ──────────────────────────────────────────
export async function downloadAppealPdf(appealId) {
  const res = await api.get(`/api/appeals/${appealId}/pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Appeal-APL-${appealId}-Documents.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ── LIST ORIGINAL UPLOADED DOCUMENTS ────────────────────────────────────────
export async function getAppealDocuments(appealId) {
  const res = await api.get(`/api/appeals/${appealId}/documents`);
  return res.data;
}

// ── VIEW ONE ORIGINAL DOCUMENT (opens in new tab) ───────────────────────────
export async function viewAppealDocument(appealId, documentId) {
  const res = await api.get(
    `/api/appeals/${appealId}/documents/${documentId}/view`,
    { responseType: 'blob' }
  );
  const contentType = res.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([res.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const newTab = window.open(url, '_blank');
  if (!newTab) window.location.href = url;
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
}

// ── DOWNLOAD ONE ORIGINAL DOCUMENT (with original filename) ─────────────────
export async function downloadAppealDocument(appealId, documentId, fileName) {
  const res = await api.get(
    `/api/appeals/${appealId}/documents/${documentId}/download`,
    { responseType: 'blob' }
  );
  const contentType = res.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([res.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `appeal-${appealId}-doc-${documentId}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}