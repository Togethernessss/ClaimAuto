import api from '../../api/axiosClient';

export async function getAllKPIs() {
  const res = await api.get('/api/reports/kpis');
  return res.data;
}

export async function getAllReports(scope = null) {
  const params = {};
  if (scope) params.scope = scope;
  const res = await api.get('/api/reports', { params });
  return res.data;
}

export async function generateReport(scope) {
  const res = await api.post('/api/reports', { scope });
  return res.data;
}

export async function getReportPdf(id) {
  const res = await api.get(
    `/api/reports/${id}/pdf`,
    { responseType: 'blob' }
  );
  return res.data;
}