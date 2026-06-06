// Shared utility functions for the Policies module.
// Defined here once — imported wherever needed.

// ₹5000 → "₹5,000"   |   null → "—"
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

// Returns Bootstrap badge colour for each status
export function statusVariant(status) {
  switch (status) {
    case 'Active':    return 'success';
    case 'Expired':   return 'secondary';
    case 'Suspended': return 'warning';
    default:          return 'secondary';
  }
}