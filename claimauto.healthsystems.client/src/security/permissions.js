// Single source of truth for what each role can see.
// Mirrors the [Authorize(Roles = "...")] attributes on the backend controllers.
//
// IMPORTANT: This is for UI/UX only. The backend is the actual security boundary.

// All roles your backend recognizes
export const ROLES = {
  ADMIN: 'Admin',
  STAFF: 'InsuranceStaff',
  HOSPITAL: 'Hospital',
  POLICYHOLDER: 'Policyholder',
};

// Each menu item lists the roles allowed to see it.
// `null` = no path yet (placeholder); we'll add real routes module-by-module.
export const MENU_ITEMS = [
  // Dashboard — one entry per role since each role has its own dashboard URL
  { key: 'dashboard-admin',        label: 'Dashboard', icon: 'bi-speedometer2', path: '/admin/dashboard',        roles: ['Admin'] },
  { key: 'dashboard-staff',        label: 'Dashboard', icon: 'bi-speedometer2', path: '/staff/dashboard',        roles: ['InsuranceStaff'] },
  { key: 'dashboard-hospital',     label: 'Dashboard', icon: 'bi-speedometer2', path: '/hospital/dashboard',     roles: ['Hospital'] },
  { key: 'dashboard-policyholder', label: 'Dashboard', icon: 'bi-speedometer2', path: '/policyholder/dashboard', roles: ['Policyholder'] },

  // Common to everyone
  { key: 'claims',      label: 'Claims',            icon: 'bi-file-medical',     path: '/claims',          roles: ['Admin','InsuranceStaff','Hospital','Policyholder'] },
  { key: 'appeals',     label: 'Appeals',           icon: 'bi-megaphone',        path: '/appeals',         roles: ['Admin','InsuranceStaff','Hospital','Policyholder'] },
  { key: 'notifications', label: 'Notifications',   icon: 'bi-bell',             path: '/notifications',   roles: ['Admin','InsuranceStaff','Hospital','Policyholder'] },

  // Admin + Staff
  { key: 'members',     label: 'Members',           icon: 'bi-people',           path: '/members',         roles: ['Admin','InsuranceStaff'] },
  { key: 'adjudication',label: 'Adjudication',      icon: 'bi-check2-square',    path: '/adjudication',    roles: ['Admin','InsuranceStaff'] },
  { key: 'fraud',       label: 'Fraud Cases',       icon: 'bi-shield-exclamation', path: '/fraud',         roles: ['Admin','InsuranceStaff'] },
  { key: 'payments',    label: 'Payments',          icon: 'bi-credit-card',      path: '/payments',        roles: ['Admin','InsuranceStaff'] },
  { key: 'reports',     label: 'Reports',           icon: 'bi-graph-up',         path: '/reports',         roles: ['Admin','InsuranceStaff'] },
  { key: 'tasks',       label: 'Tasks',             icon: 'bi-list-task',        path: '/tasks',           roles: ['Admin','InsuranceStaff'] },

  // Hospital + Admin + Staff
  { key: 'policies',    label: 'Policies',          icon: 'bi-shield-check',     path: '/policies',        roles: ['Admin','InsuranceStaff','Hospital'] },
  { key: 'remittance',  label: 'Remittance',        icon: 'bi-receipt',          path: '/remittance',      roles: ['Admin','InsuranceStaff','Hospital'] },

  // Admin only
  { key: 'rules',       label: 'Rules Engine',      icon: 'bi-gear',             path: '/rules',           roles: ['Admin'] },
  { key: 'auditlogs',   label: 'Audit Logs',        icon: 'bi-journal-text',     path: '/audit-logs',      roles: ['Admin'] },
  { key: 'auditpkg',    label: 'Audit Packages',    icon: 'bi-archive',          path: '/audit-packages',  roles: ['Admin'] },
];

// Helper used by sidebar + dashboard
export function getMenuForRole(role) {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}

// Helper used by inline guards (e.g., show/hide a button)
export function canAccess(role, allowedRoles) {
  return allowedRoles.includes(role);
}

// Returns the dashboard URL for a given role.
// Used after login (Login.jsx, VerifyMfa.jsx) and on the root redirect (App.jsx).
// Single source of truth — change a dashboard path here and all 3 places update.
export function getDashboardPath(role) {
  switch (role) {
    case 'Admin':          return '/admin/dashboard';
    case 'Hospital':       return '/hospital/dashboard';
    case 'InsuranceStaff': return '/staff/dashboard';
    case 'Policyholder':   return '/policyholder/dashboard';
    default:               return '/login';
  }
}