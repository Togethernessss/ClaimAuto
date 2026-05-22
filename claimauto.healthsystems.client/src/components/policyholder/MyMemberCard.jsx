// src/components/policyholder/MyMemberCard.jsx
// Shows the Policyholder's own enrollment details on the dashboard.
// Replaces FamilyMembersCard — no family members concept in this flow.

import { Card, Badge }  from 'react-bootstrap';
import { formatDate }   from '../../data/policyholderDashboardData';

export default function MyMemberCard({ member }) {

  if (!member) {
    return (
      <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <Card.Body className="text-center py-4">
          <i className="bi bi-person-x text-muted" style={{ fontSize: 32 }}></i>
          <div className="fw-semibold text-muted mt-2">Not Enrolled Yet</div>
          <div className="text-muted small mt-1">
            Your insurance provider will assign your membership.
            <br />
            Please contact support if this takes too long.
          </div>
        </Card.Body>
      </Card>
    );
  }

  const statusVariant =
    member.status === 'Active'    ? 'success'   :
    member.status === 'Suspended' ? 'warning'   :
    member.status === 'Inactive'  ? 'secondary' : 'secondary';

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>

      <Card.Header
        className="bg-white border-bottom d-flex align-items-center justify-content-between py-3"
      >
        <div className="fw-bold d-flex align-items-center">
          <i className="bi bi-person-badge text-primary me-2 fs-5"></i>
          My Enrollment Details
        </div>
        <Badge bg={statusVariant} pill className="px-3 py-2">
          {member.status}
        </Badge>
      </Card.Header>

      <Card.Body className="p-3">

        {/* Member Number — prominently displayed */}
        <div
          className="d-flex align-items-center gap-3 p-3 mb-3 rounded-3"
          style={{ background: '#f0f4ff', border: '1px solid #c7d2fe' }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
            }}
          >
            <i className="bi bi-person-fill" style={{ fontSize: '1.1rem' }}></i>
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '1.05rem' }}>{member.name}</div>
            <div
              className="font-monospace fw-semibold"
              style={{ fontSize: '0.8rem', color: '#6366f1' }}
            >
              {member.memberNumber ?? '—'}
            </div>
          </div>
        </div>

        {/* Details grid */}
        {[
          {
            icon:  'bi-shield-check',
            label: 'Policy',
            value: member.policyName ?? '—',
          },
          {
            icon:  'bi-calendar-check',
            label: 'Coverage Start',
            value: formatDate(member.coverageStart),
          },
          {
            icon:  'bi-calendar-x',
            label: 'Coverage End',
            value: member.coverageEnd ? formatDate(member.coverageEnd) : 'Open-ended',
          },
          {
            icon:  'bi-gender-ambiguous',
            label: 'Gender',
            value: member.gender ?? '—',
          },
        ].map((row, idx, arr) => (
          <div
            key={row.label}
            className="d-flex align-items-center justify-content-between py-2"
            style={{
              borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div
              className="d-flex align-items-center gap-2 text-muted"
              style={{ fontSize: '0.8rem' }}
            >
              <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>
              {row.label}
            </div>
            <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>
              {row.value}
            </div>
          </div>
        ))}

        <div
          className="mt-3 small text-muted text-center"
          style={{ fontSize: '0.72rem' }}
        >
          <i className="bi bi-info-circle me-1"></i>
          Your enrollment is managed by your insurance provider.
          Contact support to update details.
        </div>

      </Card.Body>
    </Card>
  );
}