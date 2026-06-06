// Shared utility functions for the Payments module.
// Defined here once — imported wherever needed.

// ₹25000 → "₹25,000"   |   null → "—"
export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// "2024-01-01T00:00:00" → "Jan 01, 2024"   |   null → "—"
export function formatDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

// "2024-01-01T14:30:00" → "Jan 01, 2024 · 2:30 PM"
export function formatDateTime(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// Returns inline style object for status badge
export function statusStyle(status) {
  switch (status) {
    case 'Pending':    return { bg: '#fff3cd', text: '#856404' };
    case 'Authorized': return { bg: '#cfe2ff', text: '#084298' };
    case 'Executed':   return { bg: '#d1e7dd', text: '#0a3622' };
    case 'OnHold':     return { bg: '#f8d7da', text: '#842029' };
    default:           return { bg: '#e2e3e5', text: '#41464b' };
  }
}

// Format payment ID — 42 → "#PAY-42"
export function formatPaymentId(id) {
  return `#PAY-${id}`;
}