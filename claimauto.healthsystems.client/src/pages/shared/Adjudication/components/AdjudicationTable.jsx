// src/pages/shared/Adjudication/components/AdjudicationTable.jsx
import { Card, Table, Button, Alert, Spinner } from 'react-bootstrap';
import {
  formatDate, formatCurrency,
  claimStatusStyle, claimTypeStyle,
  ADJUDICABLE_STATUSES,
} from '../utils/adjudicationHelpers';

function StatusBadge({ status }) {
  const s = claimStatusStyle(status);
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 600,
    }}>
      {status === 'UnderReview' ? 'Under Review' : status}
    </span>
  );
}

function TypeBadge({ type }) {
  const s = claimTypeStyle(type);
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500,
    }}>
      {type}
    </span>
  );
}

export default function AdjudicationTable({
  claims,
  loading,
  error,
  hasFilters,
  actionLoading,
  onRetry,
  onManualAdjudicate,
  onViewResult,
  isPendingQueue = false,  // true = pending review section, false = history section
}) {

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

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Alert variant="danger" className="d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <Button
              variant="link" size="sm"
              className="ms-auto p-0 text-danger"
              onClick={onRetry}
            >
              <i className="bi bi-arrow-clockwise me-1"></i> Retry
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (claims.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <i
            className="bi bi-check2-square"
            style={{ fontSize: 48, color: '#dfe4ea' }}
          ></i>
          <div className="fw-semibold text-muted mt-3">
            {hasFilters
              ? 'No claims match your filters'
              : isPendingQueue
              ? 'No claims pending manual review'
              : 'No claims yet'}
          </div>
          <div className="small text-muted mt-1">
            {hasFilters
              ? 'Try clearing your filters.'
              : isPendingQueue
              ? 'All claims have been adjudicated. ✅'
              : 'Claims will appear here once submitted.'}
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead style={{
              backgroundColor: isPendingQueue ? '#fff8f0' : '#f8f9fa',
              borderBottom: '2px solid #dee2e6',
            }}>
              <tr>
                <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">Claim</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Member</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Provider</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Type</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Billed</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Status</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Submitted</th>
                <th className="py-3 pe-4 text-muted small fw-semibold text-uppercase text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const canAdjudicate = ADJUDICABLE_STATUSES.includes(claim.status);
                const isActioning   = actionLoading === claim.claimID;

                return (
                  <tr
                    key={claim.claimID}
                    style={{
                      // Highlight pending review rows with a subtle warm background
                      background: isPendingQueue ? '#fffbf5' : 'white',
                    }}
                  >

                    {/* Claim ID */}
                    <td className="ps-4 py-3">
                      <div className="fw-semibold font-monospace" style={{ fontSize: 13 }}>
                        CLM-{claim.claimID}
                      </div>
                      {claim.externalClaimRef && (
                        <div className="text-muted" style={{ fontSize: 10 }}>
                          {claim.externalClaimRef}
                        </div>
                      )}
                    </td>

                    {/* Member + Policy */}
                    <td className="py-3">
                      <div className="small fw-semibold">{claim.memberName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {claim.policyName}
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="py-3 small">{claim.providerName}</td>

                    {/* Type */}
                    <td className="py-3">
                      <TypeBadge type={claim.claimType} />
                    </td>

                    {/* Amount */}
                    <td className="py-3 fw-semibold small">
                      {formatCurrency(claim.totalBilledAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3">
                      <StatusBadge status={claim.status} />
                    </td>

                    {/* Submitted date */}
                    <td className="py-3 small text-muted">
                      {formatDate(claim.submittedAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 pe-4">
                      <div className="d-flex flex-column align-items-end gap-1">

                        {/* ── Manual Adjudicate button ───────────────────────
                            Shown for claims that can still be decided.
                            isPendingQueue = true  → "Decide Now" (urgent, filled style)
                            isPendingQueue = false → "Manual" (subtle outline style)  */}
                        {canAdjudicate && onManualAdjudicate && (
                          <Button
                            size="sm"
                            disabled={isActioning}
                            onClick={() => onManualAdjudicate(claim)}
                            style={{
                              width: 120,
                              borderRadius: 6,
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              // Pending queue = filled orange (urgent)
                              // History table = outline orange (subtle)
                              background: isPendingQueue
                                ? 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)'
                                : '#fff3e0',
                              border: isPendingQueue
                                ? 'none'
                                : '1.5px solid #e65100',
                              color: isPendingQueue ? 'white' : '#e65100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              padding: '5px 0',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#e65100';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isPendingQueue
                                ? 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)'
                                : '#fff3e0';
                              e.currentTarget.style.color = isPendingQueue
                                ? 'white' : '#e65100';
                            }}
                          >
                            {isActioning ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <i
                                  className="bi bi-pencil-fill"
                                  style={{ fontSize: '0.72rem' }}
                                ></i>
                                {isPendingQueue ? 'Decide Now' : 'Manual'}
                              </>
                            )}
                          </Button>
                        )}

                        {/* ── View Result button ────────────────────────────
                            Shown for claims already adjudicated (Approved,
                            Rejected, Adjudicated, Paid) — read-only view
                            showing decision + calculations + rule trace.     */}
                        {!canAdjudicate && (
                          <Button
                            size="sm"
                            onClick={() => onViewResult(claim)}
                            style={{
                              width: 120,
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
                            <i
                              className="bi bi-eye"
                              style={{ fontSize: '0.72rem' }}
                            ></i>
                            View Result
                          </Button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
