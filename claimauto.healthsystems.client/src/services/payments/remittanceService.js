import api from '../../api/axiosClient';

export async function getAllRemittances(
  status   = null,
  search   = null,
  claimId  = null,
  dateFrom = null,
  dateTo   = null)
{
  const params = {};
  if (status)   params.status   = status;
  if (search)   params.search   = search;
  if (claimId)  params.claimId  = claimId;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo)   params.dateTo   = dateTo;
  const res = await api.get('/api/payments/remittances', { params });
  return res.data;
}

export async function acknowledgeRemittance(paymentId) {
  const res = await api.put(
    `/api/payments/${paymentId}/remittance/acknowledge`);
  return res.data;
}

export async function getRemittanceByPaymentId(paymentId) {
  const res = await api.get(
    `/api/payments/${paymentId}/remittance`);
  return res.data;
}

export async function downloadRemittancePdf(paymentId) {
  const res = await api.get(
    `/api/payments/${paymentId}/remittance/pdf`,
    { responseType: 'blob' }
  );
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: 'application/pdf' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download',
    `Remittance-PAY-${paymentId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}