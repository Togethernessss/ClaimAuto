// src/pages/Admin/Rules/utils/ruleHelpers.js

export function formatDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

// ── RULE STATUS ───────────────────────────────────────────────────────────────
export function ruleStatusStyle(status) {
  switch (status) {
    case 'Active':   return { bg: '#d1f2eb', color: '#085041' };
    case 'Inactive': return { bg: '#f5f5f5', color: '#757575' };
    case 'Draft':    return { bg: '#fff3e0', color: '#e65100' };
    default:         return { bg: '#e2e3e5', color: '#41464b' };
  }
}

export function ruleStatusIcon(status) {
  switch (status) {
    case 'Active':   return 'bi-check-circle-fill';
    case 'Inactive': return 'bi-pause-circle-fill';
    case 'Draft':    return 'bi-pencil-fill';
    default:         return 'bi-circle';
  }
}

// ── RULE TYPE ─────────────────────────────────────────────────────────────────
export function ruleTypeStyle(type) {
  switch (type) {
    case 'Coverage':   return { bg: '#e3f2fd', color: '#0C447C' };
    case 'Payment':    return { bg: '#d1f2eb', color: '#085041' };
    case 'Validation': return { bg: '#f3e5f5', color: '#6a1b9a' };
    default:           return { bg: '#e2e3e5', color: '#41464b' };
  }
}

export function ruleTypeIcon(type) {
  switch (type) {
    case 'Coverage':   return 'bi-shield-check';
    case 'Payment':    return 'bi-credit-card';
    case 'Validation': return 'bi-check2-square';
    default:           return 'bi-gear';
  }
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
export const RULE_TYPES    = ['Coverage', 'Payment', 'Validation'];
export const RULE_STATUSES = ['Active', 'Inactive', 'Draft'];

// ── JSON PRETTY PRINT ─────────────────────────────────────────────────────────
export function prettyJSON(jsonStr) {
  if (!jsonStr) return '—';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}