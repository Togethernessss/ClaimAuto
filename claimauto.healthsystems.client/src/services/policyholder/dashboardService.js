// ═════════════════════════════════════════════════════════════════════════════
// Policyholder Dashboard Service
// Calls 6 backend endpoints in parallel, then runs each response through a
// MAPPER so the existing 11 dashboard components can consume the data
// without ANY changes to their code.
// ═════════════════════════════════════════════════════════════════════════════

import { getActivePolicies }                          from '../policies/policyService';
import { getAllClaims }                               from '../claims/claimService';
import { getMyMemberEnrollments }                   from '../members/memberService';
import {
  getMyNotifications,
  markAsRead,
  dismissNotification,
} from '../notifications/notificationService';
import { getAllPayments }                             from '../payments/paymentService';
import {
  getAllAppeals,
  withdrawAppeal,
} from '../appeals/appealService';

// ═════════════════════════════════════════════════════════════════════════════
// MAPPERS — translate backend DTO shape ➜ component-expected shape
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Policy mapper.
 * Uses sumInsured as the primary coverage amount. Falls back to
 * coverageRulesJSON if sumInsured is null (legacy data support).
 */
function mapPolicy(p) {
  if (!p) return null;

  let coverageAmount = p.sumInsured ? Number(p.sumInsured) : null;

  if (coverageAmount == null && p.coverageRulesJSON) {
    try {
      const rules = JSON.parse(p.coverageRulesJSON);
      coverageAmount = rules.coverageAmount ?? rules.annualLimit ?? null;
    } catch { /* malformed JSON — ignore */ }
  }

  return {
    policyID:         p.policyID,
    planCode:         p.planCode,
    planName:         p.planName,
    coverageAmount:   coverageAmount ?? 0,
    deductibleAmount: p.deductibleAmount ?? 0,
    effectiveFrom:    p.effectiveFrom,
    effectiveTo:      p.effectiveTo,
    status:           p.status,
  };
}

/**
 * Claim mapper.
 * Renames backend fields to what the dashboard components expect.
 * Tries to extract "Procedure at Hospital" from the Notes field
 * (the seed encodes it this way). Falls back to claimType + providerName.
 */
function mapClaim(c) {
  let procedureName = c.claimType;
  let hospitalName  = c.providerName;

  if (c.notes && typeof c.notes === 'string') {
    const parts = c.notes.split(' at ');
    if (parts.length === 2) {
      procedureName = parts[0].trim();
      hospitalName  = parts[1].trim();
    }
  }

  const isApprovedOrPaid = ['Approved', 'Paid', 'Partial'].includes(c.status);

  return {
    claimID:         c.claimID,
    memberID:        c.memberID,
    policyID:        c.policyID,                    // needed to scope coverage usage by active policy
    dateOfService:   c.submittedAt,
    hospitalName,
    procedureName,
    amount:          c.totalBilledAmount,
    // Prefer real approved amount; only fall back to billed when backend hasn't
    // sent one yet (e.g. very old claims with no AdjudicationRecord).
    approvedAmount:  isApprovedOrPaid ? (c.approvedAmount ?? c.totalBilledAmount) : null,
    status:          c.status,
  };
}

/**
 * Member mapper.
 * Backend has no `relation` column. We try to parse it from `contactInfoJSON`
 * (the seed stores it there). Eligibility endpoint is blocked for Policyholder,
 * so we infer eligibility from the Member.Status field.
 */
function mapMember(m) {
  if (!m) return null;
  return {
    memberID:     m.memberID,
    policyID:     m.policyID,
    memberNumber: m.memberNumber,
    name:         m.name,
    dob:          m.dob,
    gender:       m.gender,
    policyName:   m.policyName,
    coverageStart: m.coverageStart,
    coverageEnd:  m.coverageEnd,
    status:       m.status,
    eligible:     m.status === 'Active',
  };
}

/**
 * Payment mapper.
 * Renames executedAt ➜ paidAt, paymentMethod ➜ mode, referenceNumber ➜ reference.
 * Normalizes backend statuses (Executed/Authorized/Pending) into the
 * UI-friendly Paid/Processing labels that RecentPaymentsCard expects.
 */
function mapPayment(p) {
  let uiStatus = 'Processing';
  if (p.status === 'Executed')      uiStatus = 'Paid';
  else if (p.status === 'OnHold')   uiStatus = 'On Hold';

  return {
    paymentID:  p.paymentID,
    claimID:    p.claimID,
    amount:     p.amount,
    paidAt:     p.executedAt ?? p.createdAt,
    mode:       p.paymentMethod,
    status:     uiStatus,
    reference:  p.referenceNumber,
  };
}

// Notification and Appeal shapes already match — pass through.
function mapNotification(n) { return n; }
function mapAppeal(a)       { return a; }

// ═════════════════════════════════════════════════════════════════════════════
// FETCH ALL DASHBOARD DATA
// 6 endpoints called in parallel. Each wrapped in `safe()` so that a single
// endpoint failure (e.g., 403 on a permissions edge case) doesn't blow up
// the entire dashboard — that section just shows empty.
// ═════════════════════════════════════════════════════════════════════════════
export async function fetchDashboardData() {
  const safe = (promise, fallback) =>
    promise.catch((err) => {
      console.warn(
        '[Dashboard] partial failure:',
        err.response?.status,
        err.config?.url,
        err.response?.data?.message ?? '',
      );
      return fallback;
    });

  const [policies, claims, notifications, appeals, members, payments] =
    await Promise.all([
      safe(getActivePolicies(),  []),
      safe(getAllClaims(),       []),
      safe(getMyNotifications(), []),
      safe(getAllAppeals(),      []),
      safe(getMyMemberEnrollments(), []),
      safe(getAllPayments(),     []),
    ]);

  const mappedPolicies = policies.map(mapPolicy).filter(Boolean);
  const mappedMembers = members.map(mapMember).filter(Boolean);

  return {
      policy:        mappedPolicies[0] ?? null,
      policies:      mappedPolicies,
      claims:        claims.map(mapClaim),
      notifications: notifications.map(mapNotification),
      appeals:       appeals.map(mapAppeal),
      member:        mappedMembers[0] ?? null,
      members:       mappedMembers,
      payments:      payments.map(mapPayment),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ACTIONS — real backend
// ─────────────────────────────────────────────────────────────────────────────
export async function markNotificationRead(notificationID) {
  return await markAsRead(notificationID);
}

export async function dismissNotificationById(notificationID) {
  return await dismissNotification(notificationID);
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEAL ACTIONS — real backend
// ─────────────────────────────────────────────────────────────────────────────
export async function withdrawAppealById(appealID) {
  return await withdrawAppeal(appealID);
}