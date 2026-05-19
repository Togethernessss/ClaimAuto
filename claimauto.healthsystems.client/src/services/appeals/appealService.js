import axiosClient from '../../api/axiosClient';

const BASE = '/api/appeals';

// ─────────────────────────────────────────────────────────────────────────────
// APPEALS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/appeals — role-scoped on backend
export async function getAllAppeals() {
  const { data } = await axiosClient.get(BASE);
  return data;
}

// GET /api/appeals/{id}
export async function getAppealById(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}`);
  return data;
}

// POST /api/appeals — file a new appeal
export async function fileAppeal(dto) {
  const { data } = await axiosClient.post(BASE, dto);
  return data;
}

// PUT /api/appeals/{id}/decide — Admin/Staff only
export async function decideAppeal(id, dto) {
  const { data } = await axiosClient.put(`${BASE}/${id}/decide`, dto);
  return data;
}

// PUT /api/appeals/{id}/withdraw — filer only
export async function withdrawAppeal(id) {
  const { data } = await axiosClient.put(`${BASE}/${id}/withdraw`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBROGATION (Admin/Staff only)
// ─────────────────────────────────────────────────────────────────────────────

export async function createSubrogation(dto) {
  const { data } = await axiosClient.post(`${BASE}/subrogation`, dto);
  return data;
}

export async function getSubrogations() {
  const { data } = await axiosClient.get(`${BASE}/subrogation`);
  return data;
}