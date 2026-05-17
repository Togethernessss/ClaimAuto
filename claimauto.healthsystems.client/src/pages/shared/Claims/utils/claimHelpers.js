
// ── DATE / CURRENCY FORMATTERS ────────────────────────────────────────────────

// "2026-05-14T10:30:00Z" → "14 May 2026"
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

// "2026-05-14T10:30:00Z" → "14 May 2026, 10:30 AM"
export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// 50000 → "₹50,000"  |  null → "—"
export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// ── BADGE VARIANT HELPERS ─────────────────────────────────────────────────────

// Claim status → Bootstrap badge bg color
export function statusVariant(status) {
  switch (status) {
    case 'Submitted':    return 'secondary';
    case 'UnderReview':  return 'info';
    case 'Adjudicated':  return 'primary';
    case 'Approved':     return 'success';
    case 'Paid':         return 'success';
    case 'Rejected':     return 'danger';
    default:             return 'secondary';
  }
}

// Claim status → human-readable label
export function statusLabel(status) {
  switch (status) {
    case 'Submitted':    return 'Submitted';
    case 'UnderReview':  return 'Under Review';
    case 'Adjudicated':  return 'Adjudicated';
    case 'Approved':     return 'Approved';
    case 'Paid':         return 'Paid';
    case 'Rejected':     return 'Rejected';
    default:             return status || '—';
  }
}

// Priority → Bootstrap badge bg color
export function priorityVariant(priority) {
  switch (priority) {
    case 'Normal': return 'light';
    case 'High':   return 'warning';
    case 'Urgent': return 'danger';
    default:       return 'secondary';
  }
}

// Priority → text color (for light badge readability)
export function priorityTextColor(priority) {
  switch (priority) {
    case 'Normal': return 'dark';
    case 'High':   return 'dark';
    case 'Urgent': return 'white';
    default:       return 'dark';
  }
}

// Claim type → Bootstrap badge bg color
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

// Claim type → icon
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

// Document status → Bootstrap badge bg color
export function docStatusVariant(status) {
  switch (status) {
    case 'Pending':   return 'warning';
    case 'Verified':  return 'success';
    case 'Rejected':  return 'danger';
    default:          return 'secondary';
  }
}

// Line status → Bootstrap badge bg color
export function lineStatusVariant(status) {
  switch (status) {
    case 'Pending':  return 'warning';
    case 'Approved': return 'success';
    case 'Denied':   return 'danger';
    default:         return 'secondary';
  }
}

// Adjudication decision → variant
export function adjDecisionVariant(decision) {
  switch (decision) {
    case 'Approved':      return 'success';
    case 'Denied':        return 'danger';
    case 'PendingReview': return 'warning';
    default:              return 'secondary';
  }
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

export const CLAIM_TYPES = [
  'Inpatient',
  'Outpatient',
  'Pharmacy',
  'Emergency',
  'Reimbursement',
];

export const HOSPITAL_CLAIM_TYPES = [
  'Inpatient',
  'Outpatient',
  'Pharmacy',
  'Emergency',
];

export const CLAIM_STATUSES = [
  'Submitted',
  'UnderReview',
  'Adjudicated',
  'Approved',
  'Paid',
  'Rejected',
];

export const CLAIM_PRIORITIES = ['Normal', 'High', 'Urgent'];

export const DOC_TYPES = [
  'Invoice',
  'MedicalRecord',
  'LabReport',
  'Prescription',
  'DischargeSummary',
];

// ── SIMULATE FILE URI + SHA256 ────────────────────────────────────────────────
// In production these come from S3/Azure after real file upload.
// For this project we generate a plausible-looking value.

export function simulateFileURI(claimId, docType, fileName) {
  const ext = fileName?.split('.').pop() || 'pdf';
  return `uploads/claim-${claimId}-${docType.toLowerCase()}-${Date.now()}.${ext}`;
}

export function simulateSHA256() {
  // Returns a 64-char hex string that looks like a real SHA-256 hash
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}