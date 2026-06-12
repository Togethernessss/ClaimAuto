export const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

export const navLinks = [
  { label: 'Home',         href: '#home' },
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how' },
  { label: 'Who It Helps', href: '#stakeholders' },
];

export const heroFeatures = [
  { icon: 'bi-check2-circle',     label: 'Auto Adjudication Engine' },
  { icon: 'bi-shield-check',      label: 'Fraud Detection' },
  { icon: 'bi-lightning-charge',  label: 'Real-time Notifications' },
  { icon: 'bi-graph-up-arrow',    label: 'Live KPI Dashboard' },
];

export const statsData = [
  { icon: 'bi-file-medical-fill', val: '10,000+', label: 'Claims Processed',       color: '#667eea' },
  { icon: 'bi-cpu-fill',           val: '82%',     label: 'Auto-Adjudication Rate', color: '#764ba2' },
  { icon: 'bi-shield-fill-check',  val: '97.3%',   label: 'Payment Accuracy',       color: '#43a047' },
  { icon: 'bi-people-fill',         val: '4 Roles', label: 'Stakeholder Access',     color: '#f9a825' },
];

export const featuresData = [
  {
    icon: 'bi-file-medical',
    title: 'Claims Processing',
    desc: 'Submit, track, and manage health insurance claims with document uploads, claim lines, and full status history.',
    color: '#e3f2fd',
    iconColor: '#1565c0',
  },
  {
    icon: 'bi-cpu',
    title: 'Auto Adjudication',
    desc: 'Rule-based engine auto-approves, denies, or routes claims to manual review. Full decision trace for every claim.',
    color: '#f3e5f5',
    iconColor: '#6a1b9a',
  },
  {
    icon: 'bi-shield-exclamation',
    title: 'Fraud Detection',
    desc: '4-factor scoring engine flags high-risk claims. Auto-opens fraud cases with ACID-safe notifications.',
    color: '#ffebee',
    iconColor: '#c62828',
  },
  {
    icon: 'bi-journal-check',
    title: 'Appeals & Subrogation',
    desc: 'File and decide appeals with full audit trail. Initiate subrogation to recover costs from third parties.',
    color: '#fff8e1',
    iconColor: '#e65100',
  },
  {
    icon: 'bi-credit-card-2-front',
    title: 'Payments & Remittance',
    desc: 'Process approved claim payments, reconcile batches, and generate remittance advice for hospitals.',
    color: '#e8f5e9',
    iconColor: '#2e7d32',
  },
  {
    icon: 'bi-graph-up',
    title: 'Reports & Audit Logs',
    desc: 'Live KPIs, scheduled reports, and tamper-proof audit packages. Full compliance and system transparency.',
    color: '#e0f7fa',
    iconColor: '#00695c',
  },
];

export const stepsData = [
  {
    step: '01',
    icon: 'bi-file-earmark-plus',
    title: 'Submit Claim',
    desc: 'Hospital or policyholder submits a claim with diagnosis, treatment details, and supporting documents.',
  },
  {
    step: '02',
    icon: 'bi-cpu-fill',
    title: 'Auto Adjudication',
    desc: 'The rule engine evaluates the claim against policy coverage, medical necessity, and fraud scores — in seconds.',
  },
  {
    step: '03',
    icon: 'bi-person-check',
    title: 'Manual Review (if needed)',
    desc: 'High-value or flagged claims are routed to Insurance Staff for manual decision with full context.',
  },
  {
    step: '04',
    icon: 'bi-cash-coin',
    title: 'Payment Disbursed',
    desc: 'Approved amounts are processed and remittance advice is sent to the hospital automatically.',
  },
];

export const stakeholdersData = [
  {
    icon: 'bi-person-heart',
    role: 'Policyholder',
    tagline: 'Your health, your claims always in sight.',
    desc: 'View your active policy, submit claims, track approvals, file appeals, and manage enrolled family members all in one dashboard.',
    features: ['Submit & track claims', 'View policy coverage', 'File & monitor appeals', 'Family member eligibility'],
    color: '#e3f2fd',
    iconColor: '#1565c0',
    btnLabel: 'Login as Policyholder',
  },
  {
    icon: 'bi-hospital',
    role: 'Hospital',
    tagline: 'Seamless billing, faster payments.',
    desc: 'Submit patient claims, verify eligibility in real-time, track billing status, and acknowledge incoming payments with zero paperwork.',
    features: ['Submit patient claims', 'Real-time eligibility check', 'Track payment status', 'Acknowledge remittances'],
    color: '#e8f5e9',
    iconColor: '#2e7d32',
    btnLabel: 'Login as Hospital',
  },
  {
    icon: 'bi-shield-lock',
    role: 'Insurance Staff',
    tagline: 'Efficient operations from queue to close.',
    desc: 'Manage the claims queue, adjudicate complex cases, review fraud alerts, handle appeals, process payments, and manage daily tasks.',
    features: ['Claims adjudication queue', 'Fraud case investigation', 'Appeal decisions', 'Payment processing'],
    color: '#fff3e0',
    iconColor: '#e65100',
    btnLabel: 'Login as Staff',
  },
  {
    icon: 'bi-gear-wide-connected',
    role: 'Admin',
    tagline: 'Total control. Full visibility.',
    desc: 'Manage all system users, configure adjudication rules, monitor system health, generate compliance reports, and review audit logs.',
    features: ['User & role management', 'Adjudication rules config', 'System health monitor', 'Audit packages & KPIs'],
    color: '#f3e5f5',
    iconColor: '#6a1b9a',
    btnLabel: 'Login as Admin',
  },
];