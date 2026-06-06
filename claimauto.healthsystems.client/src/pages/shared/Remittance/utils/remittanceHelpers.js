export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRemittanceId(id) {
  return `#REM-${id}`;
}

export function formatPaymentId(id) {
  return `#PAY-${id}`;
}

export function statusStyle(status) {
  switch (status) {
    case 'Generated':    return { bg: '#e3f2fd', text: '#0C447C' };
    case 'Sent':         return { bg: '#fef3c7', text: '#633806' };
    case 'Acknowledged': return { bg: '#d1f2eb', text: '#085041' };
    default:             return { bg: '#e2e3e5', text: '#41464b' };
  }
}