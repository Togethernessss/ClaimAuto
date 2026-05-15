import { Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import {
  formatDate,
  calcAge,
  statusVariant,
  genderIcon,
} from '../utils/memberHelpers';

export default function MembersTable({
  members,
  loading,
  error,
  isAdmin,
  isStaff,
  isHospital,
  hasFilters,
  onRetry,
  onEdit,
  onCheckEligibility,
  onCreateFirst,
}) {
  const canEdit = isAdmin || isStaff;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">Loading members...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-4">
            <Alert variant="danger" className="d-flex align-items-center mb-0">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button
                variant="link"
                size="sm"
                className="ms-auto p-0 text-danger"
                onClick={onRetry}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Retry
              </Button>
            </Alert>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && members.length === 0 && (
          <div className="text-center py-5">
            <i
              className="bi bi-people"
              style={{ fontSize: 48, color: '#dfe4ea' }}
            ></i>
            <div className="fw-semibold text-muted mt-3">
              {hasFilters ? 'No members match your filters' : 'No members yet'}
            </div>
            {canEdit && !hasFilters && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3 rounded-pill"
                onClick={onCreateFirst}
              >
                <i className="bi bi-person-plus me-1"></i> Enroll First Member
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && members.length > 0 && (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">

              <thead style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6',
              }}>
                <tr>
                  <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">
                    Member
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Policy
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    DOB / Age
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Coverage Start
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Coverage End
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Status
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr key={member.memberID}>

                    {/* Member name + number + gender */}
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            backgroundColor: '#e3f2fd',
                          }}
                        >
                          <i
                            className={`${genderIcon(member.gender)} text-primary`}
                            style={{ fontSize: '1rem' }}
                          ></i>
                        </div>
                        <div>
                          <div className="fw-semibold">{member.name}</div>
                          <div
                            className="text-muted font-monospace"
                            style={{ fontSize: '0.72rem' }}
                          >
                            {member.memberNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Policy name */}
                    <td className="py-3">
                      <div className="small fw-semibold">{member.policyName}</div>
                    </td>

                    {/* DOB + Age */}
                    <td className="py-3">
                      <div className="small">{formatDate(member.dob)}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {calcAge(member.dob)}
                      </div>
                    </td>

                    {/* Coverage dates */}
                    <td className="py-3 small">{formatDate(member.coverageStart)}</td>
                    <td className="py-3 small">{formatDate(member.coverageEnd)}</td>

                    {/* Status badge */}
                    <td className="py-3">
                      <Badge
                        bg={statusVariant(member.status)}
                        className="px-3 py-2"
                      >
                        {member.status}
                      </Badge>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 pe-4">
                      <div className="d-flex flex-column align-items-end gap-1">

                        {/* Eligibility check — all roles can check */}
                        <Button
                          size="sm"
                          onClick={() => onCheckEligibility(member)}
                          style={{
                            width: 130,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            background: '#e8f5e9',
                            border: '1.5px solid #43a047',
                            color: '#2e7d32',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            padding: '5px 0',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#43a047';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#e8f5e9';
                            e.currentTarget.style.color = '#2e7d32';
                          }}
                        >
                          <i className="bi bi-shield-check" style={{ fontSize: '0.72rem' }}></i>
                          Check Eligibility
                        </Button>

                        {/* Edit — Admin + Staff only */}
                        {canEdit ? (
                          <Button
                            size="sm"
                            onClick={() => onEdit(member)}
                            style={{
                              width: 130,
                              borderRadius: 6,
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              background: '#e8f0fe',
                              border: '1.5px solid #4285f4',
                              color: '#1a56db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              padding: '5px 0',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#4285f4';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#e8f0fe';
                              e.currentTarget.style.color = '#1a56db';
                            }}
                          >
                            <i className="bi bi-pencil-fill" style={{ fontSize: '0.72rem' }}></i>
                            Edit Member
                          </Button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: '#9e9e9e',
                              fontStyle: 'italic',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            View only
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </Table>
          </div>
        )}

      </Card.Body>
    </Card>
  );
}