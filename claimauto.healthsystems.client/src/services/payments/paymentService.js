import api from '../../api/axiosClient';

export async function getAllPayments(status = null, claimId = null) {
  const params = {};
  if (status)  params.status  = status;
  if (claimId) params.claimId = claimId;
  const res = await api.get('/api/payments', { params });
  return res.data;
}

export async function getPaymentById(id) {
  const res = await api.get(`/api/payments/${id}`);
  return res.data;
}

export async function createPayment(dto) {
  const res = await api.post('/api/payments', dto);
  return res.data;
}

export async function authorizePayment(id) {
  const res = await api.put(`/api/payments/${id}/authorize`);
  return res.data;
}

export async function executePayment(id, referenceNumber) {
  const res = await api.put(`/api/payments/${id}/execute`, null, {
    params: { referenceNumber },
  });
  return res.data;
}

export async function holdPayment(id) {
  const res = await api.put(`/api/payments/${id}/hold`);
  return res.data;
}

export async function resumePayment(id) {
  const res = await api.put(`/api/payments/${id}/resume`);
  return res.data;
}

export async function getRemittance(paymentId) {
  const res = await api.get(`/api/payments/${paymentId}/remittance`);
  return res.data;
}

export async function acknowledgeRemittance(paymentId) {
  const res = await api.put(`/api/payments/${paymentId}/remittance/acknowledge`);
  return res.data;
}

export async function getReconciliations() {
  const res = await api.get('/api/payments/reconciliation');
  return res.data;
}

export async function createReconciliation(dto) {
  const res = await api.post('/api/payments/reconciliation', dto);
  return res.data;
}

export async function getReconciliationPdf(id) {
  const res = await api.get(
    `/api/payments/reconciliation/${id}/pdf`,
    { responseType: 'blob' }
  );
  return res.data;
}