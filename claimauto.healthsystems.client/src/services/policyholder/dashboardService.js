import {
  demoPolicy, demoClaims, demoNotifications,
  demoAppeals, demoMembers, demoPayments,
} from '../../data/policyholderDashboardData';

// ⚙️ Toggle this when backend services are wired up
const USE_DEMO = true;

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT YOUR REAL SERVICES HERE (uncomment when ready)
// ─────────────────────────────────────────────────────────────────────────────
// import { getActivePolicies }   from '../policies/policyService';
// import { getAllClaims }        from '../claims/claimService';
// import { getMyNotifications, markAsRead, dismissNotification } from '../notifications/notificationService';
// import { getAllAppeals, withdrawAppeal }   from '../appeals/appealService';
// import { getAllMembers }       from '../members/memberService';
// import { getPayments }         from '../payments/paymentService';

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ALL DASHBOARD DATA
// Uses 6 existing endpoints in parallel — no new backend needed
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchDashboardData() {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      policy:        demoPolicy,
      claims:        demoClaims,
      notifications: demoNotifications,
      appeals:       demoAppeals,
      members:       demoMembers,
      payments:      demoPayments,
    };
  }

  // REAL BACKEND VERSION (uncomment when ready)
  // const [policies, claims, notifications, appeals, members, payments] = await Promise.all([
  //   getActivePolicies(),           // GET /api/policies/active
  //   getAllClaims(),                // GET /api/claims (role-scoped on backend)
  //   getMyNotifications(),          // GET /api/notifications
  //   getAllAppeals(),               // GET /api/appeals (role-scoped on backend)
  //   getAllMembers(),               // GET /api/members
  //   getPayments(),                 // GET /api/payments
  // ]);
  //
  // return {
  //   policy: policies[0] || null,
  //   claims, notifications, appeals, members, payments,
  // };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ACTIONS — uses existing NotificationsController endpoints
// ─────────────────────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationID) {
  if (USE_DEMO) return { success: true };
  // return await markAsRead(notificationID);    // PUT /api/notifications/{id}/read
}

export async function dismissNotificationById(notificationID) {
  if (USE_DEMO) return { success: true };
  // return await dismissNotification(notificationID);   // PUT /api/notifications/{id}/dismiss
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEAL ACTIONS — uses existing AppealsController endpoints
// ─────────────────────────────────────────────────────────────────────────────

export async function withdrawAppealById(appealID) {
  if (USE_DEMO) {
    alert(`Demo: Appeal APP-${appealID} would be withdrawn.`);
    return { success: true };
  }
  // return await withdrawAppeal(appealID);   // PUT /api/appeals/{id}/withdraw
}