// src/pages/shared/Claims/components/ClaimsTable.jsx
import { Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import {
  formatDate, formatCurrency,
  statusVariant, statusLabel,
  priorityVariant, priorityTextColor,
  claimTypeVariant, claimTypeIcon,
} from '../utils/claimHelpers';

export default function ClaimsTable({
  claims,
  loading,
  error,
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  hasFilters,
  onRetry,
  onView,
  onUpdateStatus,
  onDelete,
}) {
  const canUpdate = isAdmin || isStaff;
  const canDelete = isAdmin || isHospital;
  const finalStatuses = ['Rejected', 'Approved', 'Paid'];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 text-muted small">Loading claims...</div>
        </Card.Body>
      </Card>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Alert variant="danger" className="d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <Button variant="link" size="sm" className="ms-auto p-0 text-danger" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i> Retry
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (claims.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <i className="bi bi-folder2" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
          <div className="fw-semibold text-muted mt-3">
            {hasFilters ? 'No claims match your filters' : 'No claims yet'}
          </div>
          <div className="small text-muted mt-1">
            {hasFilters
              ? 'Try clearing your filters to see all claims.'
              : isHospital
              ? 'Submit your first claim using the button above.'
              : isPolicyholder
              ? 'Request a reimbursement using the button above.'
              : 'Claims will appear here once submitted.'}
          </div>
        </Card.Body>
      </Card>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <tr>
                <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">Claim</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Member</th>
                {(isAdmin || isStaff) && (
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Provider</th>
                )}
                <th className="py-3 text-muted small fw-semibold text-uppercase">Type</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Amount</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Status</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Priority</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Submitted</th>
                <th className="py-3 pe-4 text-muted small fw-semibold text-uppercase text-end">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {claims.map((claim) => (
                <tr key={claim.claimID}>

                  {/* Claim ID */}
                  <td className="ps-4 py-3">
                    <div className="fw-semibold font-monospace" style={{ fontSize: '0.85rem' }}>
                      CLM-{claim.claimID}
                    </div>
                    {claim.externalClaimRef && (
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {claim.externalClaimRef}
                      </div>
                    )}
                  </td>

                  {/* Member */}
                  <td className="py-3">
                    <div className="small fw-semibold">{claim.memberName}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {claim.policyName}
                    </div>
                  </td>

                  {/* Provider — Admin + Staff only */}
                  {(isAdmin || isStaff) && (
                    <td className="py-3 small">{claim.providerName}</td>
                  )}

                  {/* Claim type */}
                  <td className="py-3">
                    <Badge bg={claimTypeVariant(claim.claimType)} className="px-2 py-1">
                      <i className={`${claimTypeIcon(claim.claimType)} me-1`}></i>
                      {claim.claimType}
                    </Badge>
                  </td>

                  {/* Amount */}
                  <td className="py-3 fw-semibold small">
                    {formatCurrency(claim.totalBilledAmount)}
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <Badge bg={statusVariant(claim.status)} className="px-3 py-2">
                      {statusLabel(claim.status)}
                    </Badge>
                  </td>

                  {/* Priority */}
                  <td className="py-3">
                    <Badge
                      bg={priorityVariant(claim.priority)}
                      text={priorityTextColor(claim.priority)}
                      className="px-2 py-1"
                      style={{ border: claim.priority === 'Normal' ? '1px solid #dee2e6' : 'none' }}
                    >
                      {claim.priority === 'Urgent' && (
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      )}
                      {claim.priority}
                    </Badge>
                  </td>

                  {/* Submitted at */}
                  <td className="py-3 small text-muted">{formatDate(claim.submittedAt)}</td>

                  {/* Actions */}
                  <td className="py-3 pe-4">
                    <div className="d-flex flex-column align-items-end gap-1">

                      {/* View detail — all roles */}
                      <Button
                        size="sm"
                        onClick={() => onView(claim)}
                        style={{
                          width: 90,
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
                        <i className="bi bi-eye" style={{ fontSize: '0.72rem' }}></i>
                        View
                      </Button>

                      {/* Update status — Admin + Staff only, not on finalized claims */}
                      {canUpdate && !finalStatuses.includes(claim.status) && (
                        <Button
                          size="sm"
                          onClick={() => onUpdateStatus(claim)}
                          style={{
                            width: 90,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            background: '#fff8e1',
                            border: '1.5px solid #f9a825',
                            color: '#e65100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            padding: '5px 0',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9a825';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff8e1';
                            e.currentTarget.style.color = '#e65100';
                          }}
                        >
                          <i className="bi bi-pencil-fill" style={{ fontSize: '0.72rem' }}></i>
                          Update
                        </Button>
                      )}

                      {/* Delete — Admin: Rejected or Submitted | Hospital: own Submitted only */}
                      {canDelete && (
                        claim.status === 'Rejected' ||
                        (claim.status === 'Submitted' && (isAdmin || isHospital))
                      ) && (
                        <Button
                          size="sm"
                          onClick={() => onDelete(claim)}
                          style={{
                            width: 90,
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            background: '#ffebee',
                            border: '1.5px solid #ef5350',
                            color: '#c62828',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            padding: '5px 0',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef5350';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffebee';
                            e.currentTarget.style.color = '#c62828';
                          }}
                        >
                          <i className="bi bi-trash-fill" style={{ fontSize: '0.72rem' }}></i>
                          Delete
                        </Button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
