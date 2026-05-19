import api from '../../api/axiosClient';

// ─── Fraud Scores ───────────────────────────────────────

export async function getFraudScore(claimId) {
    const res = await api.get(`/api/fraud/scores/${claimId}`);
    return res.data;
}

export async function scoreClaim(claimId) {
    const res = await api.post(`/api/fraud/scores/${claimId}`);
    return res.data;
}

// ─── Fraud Cases ────────────────────────────────────────

export async function getAllFraudCases(status, priority) {
    const params = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const res = await api.get('/api/fraud/cases', { params });
    return res.data;
}

export async function getFraudCaseById(id) {
    const res = await api.get(`/api/fraud/cases/${id}`);
    return res.data;
}

export async function createFraudCase(dto) {
    const res = await api.post('/api/fraud/cases', dto);
    return res.data;
}

export async function resolveFraudCase(id, dto) {
    const res = await api.put(`/api/fraud/cases/${id}/resolve`, dto);
    return res.data;
}