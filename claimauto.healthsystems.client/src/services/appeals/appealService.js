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
export async function decideAppeal(id, outcome) {
    const res = await api.put(`/api/appeals/${id}/decide`, { outcome });
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