import api from '../../api/axiosClient';

export async function getAllKPIs() {
  const res = await api.get('/api/reports/kpis');
  return res.data;
}