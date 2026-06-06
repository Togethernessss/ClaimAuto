export const ROLES = {
  ADMIN:        'Admin',
  STAFF:        'InsuranceStaff',
  HOSPITAL:     'Hospital',
  POLICYHOLDER: 'Policyholder',
};

// ── Role prefix map ───────────────────────────────────────────
const ROLE_PREFIX = {
  Admin:          '/admin',
  InsuranceStaff: '/staff',
  Hospital:       '/hospital',
  Policyholder:   '/policyholder',
};

export const MENU_ITEMS = [

  // ── Dashboard — unique path per role ──────────────────────────
  {
    key:   'dashboard-admin',
    label: 'Dashboard',
    icon:  'bi-speedometer2',
    path:  '/admin/dashboard',
    roles: ['Admin'],
  },
  {
    key:   'dashboard-staff',
    label: 'Dashboard',
    icon:  'bi-speedometer2',
    path:  '/staff/dashboard',
    roles: ['InsuranceStaff'],
  },
  {
    key:   'dashboard-hospital',
    label: 'Dashboard',
    icon:  'bi-speedometer2',
    path:  '/hospital/dashboard',
    roles: ['Hospital'],
  },
  {
    key:   'dashboard-policyholder',
    label: 'Dashboard',
    icon:  'bi-speedometer2',
    path:  '/policyholder/dashboard',
    roles: ['Policyholder'],
  },

  // ── All roles ─────────────────────────────────────────────────
  {
    key:   'claims',
    label: 'Claims',
    icon:  'bi-file-medical',
    path:  '/claims',
    roles: ['Admin','InsuranceStaff','Hospital','Policyholder'],
  },
  {
    key:   'appeals',
    label: 'Appeals',
    icon:  'bi-megaphone',
    path:  '/appeals',
    roles: ['Admin','InsuranceStaff','Hospital','Policyholder'],
  },
  {
    key:   'notifications',
    label: 'Notifications',
    icon:  'bi-bell',
    path:  '/notifications',
    roles: ['Admin','InsuranceStaff','Hospital','Policyholder'],
  },
  {
    key:   'policies',
    label: 'Policies',
    icon:  'bi-shield-check',
    path:  '/policies',
    roles: ['Admin','InsuranceStaff','Hospital','Policyholder'],
  },

  // ── Admin + Staff + Hospital ──────────────────────────────────
  {
    key:   'members',
    label: 'Members',
    icon:  'bi-people',
    path:  '/members',
    roles: ['Admin','InsuranceStaff','Hospital'],
  },
  {
    key:   'remittance',
    label: 'Remittance',
    icon:  'bi-receipt',
    path:  '/remittance',
    roles: ['Admin','InsuranceStaff','Hospital'],
  },

  // ── Admin + Staff ─────────────────────────────────────────────
  {
    key:   'adjudication',
    label: 'Adjudication',
    icon:  'bi-check2-square',
    path:  '/adjudication',
    roles: ['Admin','InsuranceStaff'],
  },
  {
    key:   'fraud',
    label: 'Fraud Cases',
    icon:  'bi-shield-exclamation',
    path:  '/fraud',
    roles: ['Admin','InsuranceStaff'],
  },
  {
    key:   'payments',
    label: 'Payments',
    icon:  'bi-credit-card',
    path:  '/payments',
    roles: ['Admin','InsuranceStaff'],
  },
  {
    key:   'reports',
    label: 'Reports',
    icon:  'bi-graph-up',
    path:  '/reports',
    roles: ['Admin','InsuranceStaff'],
  },
  {
    key:   'tasks',
    label: 'Tasks',
    icon:  'bi-list-task',
    path:  '/tasks',
    roles: ['Admin','InsuranceStaff'],
  },

  // ── Admin only ────────────────────────────────────────────────
  {
    key:   'users',
    label: 'User Management',
    icon:  'bi-people-fill',
    path:  '/admin/users',
    roles: ['Admin'],
  },
  {
    key:   'rules',
    label: 'Rules Engine',
    icon:  'bi-gear',
    path:  '/admin/rules',
    roles: ['Admin'],
  },
  {
    key:   'auditlogs',
    label: 'Audit Logs',
    icon:  'bi-journal-text',
    path:  '/admin/audit-logs',
    roles: ['Admin'],
  },
];

// ── getMenuForRole — auto-prefixes shared paths ───────────────
// Sidebar + QuickAccessGrid use this so they automatically
// get role-prefixed paths without any other changes needed
export function getMenuForRole(role) {
  const prefix = ROLE_PREFIX[role] || '';
  return MENU_ITEMS
    .filter(item => item.roles.includes(role))
    .map(item => {
      // Already has a role prefix → keep as is
      if (
        item.path.startsWith('/admin/') ||
        item.path.startsWith('/staff/') ||
        item.path.startsWith('/hospital/') ||
        item.path.startsWith('/policyholder/')
      ) {
        return item;
      }
      // Add role prefix to shared paths
      return { ...item, path: `${prefix}${item.path}` };
    });
}

export function canAccess(role, allowedRoles) {
  return allowedRoles.includes(role);
}

// ── getPagePath — resolve any shared path to its role-prefixed absolute path ─
// Use this wherever a hardcoded path like '/notifications' needs to be navigated
// to from a shared component that is rendered for multiple roles.
export function getPagePath(role, path) {
  const prefix = ROLE_PREFIX[role] || '';
  if (
    path.startsWith('/admin/') ||
    path.startsWith('/staff/') ||
    path.startsWith('/hospital/') ||
    path.startsWith('/policyholder/')
  ) {
    return path;
  }
  return `${prefix}${path}`;
}

// ── Each role has its OWN unique dashboard path ───────────────
export function getDashboardPath(role) {
  switch (role) {
    case 'Admin':          return '/admin/dashboard';
    case 'InsuranceStaff': return '/staff/dashboard';
    case 'Hospital':       return '/hospital/dashboard';
    case 'Policyholder':   return '/policyholder/dashboard';
    default:               return '/login';
  }
}