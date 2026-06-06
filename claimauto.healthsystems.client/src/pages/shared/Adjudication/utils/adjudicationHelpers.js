// src/pages/shared/Adjudication/utils/adjudicationHelpers.js

// ── DATE / CURRENCY ───────────────────────────────────────────────────────────
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

export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// ── DECISION HELPERS ──────────────────────────────────────────────────────────
// AdjDecision values: Approved (was Paid) | Denied | Partial | PendingReview.
// "Paid" is accepted as a legacy synonym while old rows still exist in the DB.
export function decisionVariant(decision) {
  switch (decision) {
    case 'Approved':
    case 'Paid':          return { bg: '#d1f2eb', color: '#085041' };
    case 'Denied':        return { bg: '#fdecea', color: '#b71c1c' };
    case 'Partial':       return { bg: '#fff3e0', color: '#e65100' };
    case 'PendingReview': return { bg: '#e3f2fd', color: '#0C447C' };
    default:              return { bg: '#e2e3e5', color: '#41464b' };
  }
}

export function decisionIcon(decision) {
  switch (decision) {
    case 'Approved':
    case 'Paid':          return 'bi-check-circle-fill';
    case 'Denied':        return 'bi-x-circle-fill';
    case 'Partial':       return 'bi-dash-circle-fill';
    case 'PendingReview': return 'bi-clock-fill';
    default:              return 'bi-question-circle';
  }
}

export function decisionLabel(decision) {
  switch (decision) {
    case 'PendingReview': return 'Pending Review';
    case 'Paid':          return 'Approved';   // legacy data → display as Approved
    default:              return decision || '—';
  }
}

// ── RULE TRACE RESULT HELPERS ─────────────────────────────────────────────────
export function traceResultStyle(result) {
  switch (result) {
    case 'PASS':    return { bg: '#d1f2eb', color: '#085041' };
    case 'FAIL':    return { bg: '#fdecea', color: '#b71c1c' };
    case 'APPLIED': return { bg: '#fff3e0', color: '#e65100' };
    case 'ROUTE':   return { bg: '#e3f2fd', color: '#0C447C' };
    case 'SKIPPED': return { bg: '#f5f5f5', color: '#757575' };
    case 'ERROR':   return { bg: '#fce4ec', color: '#880e4f' };
    default:        return { bg: '#e2e3e5', color: '#41464b' };
  }
}

// ── CLAIM STATUS HELPERS (for adjudication queue) ─────────────────────────────
// Which statuses are eligible for adjudication
export const ADJUDICABLE_STATUSES = ['Submitted', 'UnderReview'];

export function claimStatusStyle(status) {
  switch (status) {
    case 'Submitted':    return { bg: '#f3f0ff', color: '#764ba2' };
    case 'UnderReview':  return { bg: '#fff3e0', color: '#e65100' };
    case 'Approved':     return { bg: '#d1f2eb', color: '#085041' };
    case 'Rejected':     return { bg: '#fdecea', color: '#b71c1c' };
    case 'Paid':         return { bg: '#e8f5e9', color: '#1b5e20' };
    default:             return { bg: '#e2e3e5', color: '#41464b' };
  }
}

// ── CLAIM TYPE HELPERS ────────────────────────────────────────────────────────
export function claimTypeStyle(type) {
  switch (type) {
    case 'Inpatient':     return { bg: '#e3f2fd', color: '#0C447C' };
    case 'Outpatient':    return { bg: '#f3e5f5', color: '#6a1b9a' };
    case 'Pharmacy':      return { bg: '#d1f2eb', color: '#085041' };
    case 'Emergency':     return { bg: '#fdecea', color: '#b71c1c' };
    // Reimbursement claim type removed.
    default:              return { bg: '#e2e3e5', color: '#41464b' };
  }
}

// ── MANUAL DECISION OPTIONS ───────────────────────────────────────────────────
export const MANUAL_DECISIONS = [
  { value: 'Approved', label: 'Approved — Approve full payment' },
  { value: 'Denied',   label: 'Denied — Reject claim' },
  { value: 'Partial',  label: 'Partial — Approve partial payment' },
];