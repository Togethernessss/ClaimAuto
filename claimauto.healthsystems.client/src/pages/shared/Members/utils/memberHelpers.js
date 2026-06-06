// src/pages/shared/Members/utils/memberHelpers.js
// Utility functions for the Members module.

// "2024-01-01T00:00:00" → "Jan 01, 2024"  |  null → "—"
export function formatDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

// Calculate age from DOB string
// "1990-05-15" → "34 yrs"
export function calcAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  const age  = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${age} yrs`;
}

// ₹50000 → "₹50,000"  |  null → "—"
export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// Status badge colour
export function statusVariant(status) {
  switch (status) {
    case 'Active':    return 'success';
    case 'Inactive':  return 'secondary';
    case 'Suspended': return 'warning';
    default:          return 'secondary';
  }
}

// Gender icon
export function genderIcon(gender) {
  switch (gender) {
    case 'Male':   return 'bi-gender-male';
    case 'Female': return 'bi-gender-female';
    default:       return 'bi-gender-ambiguous';
  }
}