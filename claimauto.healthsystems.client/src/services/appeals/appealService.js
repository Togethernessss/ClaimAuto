import api from '../../api/axiosClient';

// ── GET ALL APPEALS ─────────────────────────────────────
export async function getAllAppeals() {
    const res = await api.get('/api/appeals');
    return res.data;
}

// ── GET ONE APPEAL ──────────────────────────────────────
export async function getAppealById(id) {
    const res = await api.get(`/api/appeals/${id}`);
    return res.data;
}

// ── FILE A NEW APPEAL (with files as multipart/form-data) ──
export async function fileAppeal(claimID, reason, files) {
    const formData = new FormData();
    formData.append('claimID', claimID);
    formData.append('reason', reason);

    if (files && files.length > 0) {
        files.forEach(file => formData.append('files', file));
    }

    const res = await api.post('/api/appeals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
}

// ── WITHDRAW MY APPEAL ──────────────────────────────────
export async function withdrawAppeal(id) {
    const res = await api.put(`/api/appeals/${id}/withdraw`);
    return res.data;
}

// ── DECIDE AN APPEAL — Admin/Staff only ─────────────────
// `partialPayableAmount` and `partialReason` are required ONLY when outcome === 'PartiallyUpheld'.
// They are ignored by the backend for Upheld / Overturned.
export async function decideAppeal(id, outcome, partialPayableAmount = null, partialReason = null) {
    const res = await api.put(`/api/appeals/${id}/decide`, {
        outcome,
        partialPayableAmount,
        partialReason,
    });
    return res.data;
}

// ─── Download Appeal Documents PDF ──────────────────────
export async function downloadAppealPdf(appealId) {
    const res = await api.get(`/api/appeals/${appealId}/pdf`, {
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Appeal-APL-${appealId}-Documents.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ── GET DOCUMENT METADATA LIST ──────────────────────────
// Returns array of { documentID, appealID, fileName, contentType, fileSize, uploadedAt }
export async function getAppealDocuments(appealId) {
    const res = await api.get(`/api/appeals/${appealId}/documents`);
    return res.data;
}

// ── VIEW DOCUMENT INLINE ────────────────────────────────
// Opens the file in a new browser tab (inline disposition).
// Uses an authenticated blob fetch so the JWT header is included.
export async function viewAppealDocument(appealId, docId) {
    const res = await api.get(
        `/api/appeals/${appealId}/documents/${docId}/view`,
        { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(res.data);
    window.open(url, '_blank', 'noopener,noreferrer');
    // Revoke after 60s to let the tab fully load
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

// ── DOWNLOAD ONE DOCUMENT WITH ORIGINAL FILENAME ────────
export async function downloadAppealDocument(appealId, docId, fileName) {
    const res = await api.get(
        `/api/appeals/${appealId}/documents/${docId}/download`,
        { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `appeal-${appealId}-doc-${docId}`;
    a.click();
    window.URL.revokeObjectURL(url);
}