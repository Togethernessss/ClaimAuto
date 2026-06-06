// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS — pure utilities used across components
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export function formatCompactCurrency(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${n}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const _u = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; const diff = (Date.now() - new Date(_u)) / 1000;
  if (diff < 60)      return 'just now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function daysUntil(iso) {
  if (!iso) return null;
  const diff = (new Date(iso) - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

export function calculateAge(dob) {
  if (!dob) return null;
  const ageMs = Date.now() - new Date(dob).getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS COLOR MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export function claimStatusVariant(status) {
  switch (status) {
    case 'Approved': case 'Paid':            return 'success';
    case 'Pending':  case 'Submitted':       return 'warning';
    case 'UnderReview': case 'DocsVerificationPending': return 'info';
    case 'Rejected':                          return 'danger';
    default:                                  return 'secondary';
  }
}

export function appealStatusVariant(status) {
  switch (status) {
    case 'Filed':       return 'info';
    case 'UnderReview': return 'warning';
    case 'Overturned':  return 'success';
    case 'Upheld':      return 'danger';
    case 'Withdrawn':   return 'secondary';
    default:            return 'secondary';
  }
}

export function notificationStyle(severity) {
  switch (severity) {
    case 'Critical': return { variant: 'danger',  emoji: '🚨', label: 'Urgent' };
    case 'Warning':  return { variant: 'warning', emoji: '⚠️', label: 'Attention' };
    case 'Info':     return { variant: 'info',    emoji: '📩', label: 'Info' };
    default:         return { variant: 'secondary', emoji: '🔔', label: 'Notice' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND-COMPUTED DERIVATIONS (use only existing backend fields)
// ─────────────────────────────────────────────────────────────────────────────

// Sum of approved/paid/partial claim amounts.
//
// activePolicyIds — array (or Set) of PolicyIDs whose claims should be counted.
// When supplied, claims against expired/inactive/deleted policies are excluded
// so "Used" never exceeds "Total Cover" purely because of a removed policy.
// When omitted (null/undefined), all claims are summed — backward compatible.
//
// We use approvedAmount when present (the real payable amount after deductible
// and co-pay); fall back to billed amount only for legacy un-adjudicated rows.
export function calculateCoverageUsed(claims, activePolicyIds = null) {
  const { total } = calculateCoverageBreakdown(claims, activePolicyIds);
  return total;
}

// Breakdown of coverage usage into "paid" (money already out the door) and
// "approved" (decisions made but payment not yet executed — still locked
// against the policy's available coverage). The total of these two is what
// reduces the policyholder's "available to claim" balance.
//
// Why split: production insurance dashboards show BOTH so the policyholder
// understands the lifecycle — "we've paid X already, and Y is queued to be
// paid soon." Hiding the split confuses people during the payment-execution
// window which can take days.
//
// Returns: { total: number, paid: number, approved: number }
//   total    — paid + approved (what reduces "Remaining")
//   paid     — sum of claims in 'Paid' status (executed)
//   approved — sum of claims in 'Approved' or 'Partial' status (queued)
export function calculateCoverageBreakdown(claims, activePolicyIds = null) {
  const activeSet = activePolicyIds
    ? new Set(activePolicyIds.map((id) => String(id)))
    : null;

  const inScope = claims.filter(
    (c) => !activeSet || activeSet.has(String(c.policyID))
  );

  const amountOf = (c) => Number(c.approvedAmount ?? c.amount ?? 0);

  const paid = inScope
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + amountOf(c), 0);

  const approved = inScope
    .filter((c) => c.status === 'Approved' || c.status === 'Partial')
    .reduce((sum, c) => sum + amountOf(c), 0);

  return { total: paid + approved, paid, approved };
}

export function calculateClaimsCountByMember(claims, memberID) {
  return claims.filter((c) => c.memberID === memberID).length;
}

export function findActiveAppeal(appeals) {
  return appeals.find((a) => ['Filed', 'UnderReview'].includes(a.status)) || null;
}

export function findRejectedClaims(claims) {
  return claims.filter((c) => c.status === 'Rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA — for offline development, toggle USE_DEMO in service file
// ─────────────────────────────────────────────────────────────────────────────

export const demoPolicy = {
  policyID: 1,
  planCode: 'FAMILY-GOLD-2024',
  planName: 'Blue Shield Premium Plus',
  coverageAmount: 1500000,
  deductibleAmount: 5000,
  effectiveFrom: '2024-01-01',
  effectiveTo: '2026-12-31',
  status: 'Active',
};

export const demoClaims = [
  { claimID: 9041, memberID: 1, dateOfService: '2026-04-28', hospitalName: 'Apollo Delhi',     procedureName: 'Appendectomy',     amount: 82000,  approvedAmount: null,   status: 'Pending' },
  { claimID: 8877, memberID: 2, dateOfService: '2026-03-14', hospitalName: 'Fortis Gurgaon',   procedureName: 'Knee Replacement',  amount: 124500, approvedAmount: null,   status: 'UnderReview' },
  { claimID: 8412, memberID: 1, dateOfService: '2026-01-09', hospitalName: 'Max Saket',        procedureName: 'Cataract Surgery',  amount: 46200,  approvedAmount: 46200,  status: 'Approved' },
  { claimID: 7988, memberID: 4, dateOfService: '2025-11-22', hospitalName: 'AIIMS Delhi',      procedureName: 'ICU – 5 Days',      amount: 308000, approvedAmount: 308000, status: 'Paid' },
  { claimID: 7654, memberID: 1, dateOfService: '2025-09-05', hospitalName: 'Medanta',          procedureName: 'Dialysis × 4',      amount: 67400,  approvedAmount: null,   status: 'Rejected' },
];

export const demoNotifications = [
  { notificationID: 1, message: 'Your claim CLM-9041 is being reviewed by Insurance Staff.', category: 'Claim',   severity: 'Warning',  createdAt: '2026-05-08T08:00:00', status: 'Unread' },
  { notificationID: 2, message: 'Appeal APP-112 awaiting decision. Expected within 5 days.', category: 'Appeal',  severity: 'Critical', createdAt: '2026-05-07T14:30:00', status: 'Unread' },
  { notificationID: 3, message: '₹46,200 credited to your account for claim CLM-8412.',     category: 'Payment', severity: 'Info',     createdAt: '2026-05-05T11:42:00', status: 'Unread' },
  { notificationID: 4, message: 'Policy renewal reminder: expires December 31, 2026.',       category: 'Policy',  severity: 'Info',     createdAt: '2026-04-26T09:00:00', status: 'Read' },
];

export const demoAppeals = [
  { appealID: 112, claimID: 7654, filedAt: '2026-04-20', reason: 'Incorrect rejection of medically necessary treatment.', status: 'UnderReview', outcome: null, decisionAt: null },
  { appealID: 88,  claimID: 6201, filedAt: '2026-02-12', reason: 'Documentation re-submission.',                          status: 'Overturned',  outcome: 'Overturned', decisionAt: '2026-02-28' },
];

export const demoMembers = [
  { memberID: 1, name: 'Diksha Pandey', relation: 'Self',     dob: '1995-03-12', eligible: true  },
  { memberID: 2, name: 'Ravi Pandey',   relation: 'Spouse',   dob: '1993-08-04', eligible: true  },
  { memberID: 3, name: 'Aditi Pandey',  relation: 'Daughter', dob: '2019-06-22', eligible: true  },
  { memberID: 4, name: 'Suresh Pandey', relation: 'Father',   dob: '1962-01-11', eligible: false },
];

export const demoPayments = [
  { paymentID: 7741, claimID: 8412, amount: 46200,  paidAt: '2026-05-06', mode: 'NEFT', status: 'Processing', reference: 'HDFC-X9F3K2' },
  { paymentID: 7588, claimID: 7988, amount: 308000, paidAt: '2026-03-20', mode: 'NEFT', status: 'Paid',       reference: 'HDFC-X8D2P9' },
  { paymentID: 7402, claimID: 7220, amount: 54000,  paidAt: '2026-02-05', mode: 'NEFT', status: 'Paid',       reference: 'HDFC-X7B1M5' },
];