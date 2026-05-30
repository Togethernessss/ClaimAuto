// ── DATE / CURRENCY FORMATTERS ────────────────────────────────────────────────

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// ── BADGE VARIANT HELPERS ─────────────────────────────────────────────────────

export function statusVariant(status) {
  switch (status) {
    case 'Submitted':               return 'secondary';
    case 'DocsVerificationPending': return 'info';
    case 'UnderReview':             return 'warning';
    case 'Approved':                return 'primary';
    case 'Paid':                    return 'success';
    case 'Rejected':                return 'danger';
    default:                        return 'secondary';
  }
}

export function statusLabel(status) {
  switch (status) {
    case 'Submitted':               return 'Submitted';
    case 'DocsVerificationPending': return 'Docs Verification';   // frontend/claim (more descriptive)
    case 'UnderReview':             return 'Under Review';
    case 'Approved':                return 'Approved';
    case 'Paid':                    return 'Paid';
    case 'Rejected':                return 'Rejected';
    default:                        return status || '—';
  }
}

export function priorityVariant(priority) {
  switch (priority) {
    case 'Normal': return 'light';
    case 'High':   return 'warning';
    case 'Urgent': return 'danger';
    default:       return 'secondary';
  }
}

export function priorityTextColor(priority) {
  switch (priority) {
    case 'Normal': return 'dark';
    case 'High':   return 'dark';
    case 'Urgent': return 'white';
    default:       return 'dark';
  }
}

export function claimTypeVariant(claimType) {
  switch (claimType) {
    case 'Inpatient':     return 'primary';
    case 'Outpatient':    return 'info';
    case 'Pharmacy':      return 'success';
    case 'Emergency':     return 'danger';
    case 'Reimbursement': return 'warning';
    default:              return 'secondary';
  }
}

export function claimTypeIcon(claimType) {
  switch (claimType) {
    case 'Inpatient':     return 'bi-hospital';
    case 'Outpatient':    return 'bi-person-walking';
    case 'Pharmacy':      return 'bi-capsule';
    case 'Emergency':     return 'bi-exclamation-triangle-fill';
    case 'Reimbursement': return 'bi-arrow-return-left';
    default:              return 'bi-file-medical';
  }
}

export function docStatusVariant(status) {
  switch (status) {
    case 'Pending':  return 'warning';
    case 'Verified': return 'success';
    case 'Rejected': return 'danger';
    default:         return 'secondary';
  }
}

export function lineStatusVariant(status) {
  switch (status) {
    case 'Pending':  return 'warning';
    case 'Approved': return 'success';
    case 'Denied':   return 'danger';
    default:         return 'secondary';
  }
}

export function adjDecisionVariant(decision) {
  switch (decision) {
    case 'Approved':      return 'success';
    case 'Partial':       return 'info';
    case 'Denied':        return 'danger';
    case 'PendingReview': return 'warning';
    default:              return 'secondary';
  }
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

export const CLAIM_TYPES = [
  'Inpatient', 'Outpatient', 'Pharmacy', 'Emergency', 'Reimbursement',
];

export const HOSPITAL_CLAIM_TYPES = [
  'Inpatient', 'Outpatient', 'Pharmacy', 'Emergency',
];

// Staff-visible statuses — used in filters and the UpdateStatusModal priority-only form.
// 'Adjudicated' REMOVED — never set in new flow (Approved directly).
// 'Validated'   REMOVED — was a manual trigger, no longer part of flow.
// All status transitions are automatic on submission.
export const CLAIM_STATUSES = [
  'Submitted',               // legacy / direct channel submissions
  'DocsVerificationPending', // awaiting staff document review before adjudication
  'UnderReview',             // fraud flagged OR adjudication routed to manual review
  'Approved',                // adjudication Paid/Partial → payment auto-created
  'Paid',                    // payment executed by staff
  'Rejected',                // denied by adjudication OR fraud confirmed
];

export const CLAIM_PRIORITIES = ['Normal', 'High', 'Urgent'];

export const DOC_TYPES = [
  'Invoice', 'MedicalRecord', 'LabReport', 'Prescription', 'DischargeSummary',
];


export async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}