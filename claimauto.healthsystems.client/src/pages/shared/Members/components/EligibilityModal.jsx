import { Modal, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { formatDate, formatCurrency } from '../utils/memberHelpers';

export default function EligibilityModal({
  show,
  loading,
  error,
  result,
  member,
  onHide,
  onRecheck,
}) {
  const isEligible = result?.status === 'Eligible';

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-6">
          <i className="bi bi-shield-check text-success me-2"></i>
          Eligibility Check
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">

        {/* Member name row */}
        {member && (
          <div
            className="d-flex align-items-center gap-2 pb-2 mb-3"
            style={{ borderBottom: '1px solid #f0f0f0' }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 32, height: 32, backgroundColor: '#e3f2fd' }}
            >
              <i className="bi bi-person text-primary" style={{ fontSize: '0.85rem' }}></i>
            </div>
            <div>
              <div className="fw-semibold" style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                {member.name}
              </div>
              <div className="font-monospace text-muted" style={{ fontSize: '0.7rem' }}>
                {member.memberNumber}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="success" size="sm" />
            <div className="text-muted mt-2" style={{ fontSize: '0.78rem' }}>
              Checking eligibility...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Alert variant="danger" className="py-2 mb-0" style={{ fontSize: '0.78rem' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </Alert>
        )}

        {/* Result */}
        {!loading && !error && result && (
          <>
            {/* Status pill — same style as status badges in the table */}
            <div className="text-center mb-3">
              <div
                className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                style={{
                  background: isEligible ? '#d1f2eb' : '#fdecea',
                  border: `1.5px solid ${isEligible ? '#a5d6a7' : '#ef9a9a'}`,
                }}
              >
                <i
                  className={isEligible
                    ? 'bi bi-check-circle-fill'
                    : 'bi bi-x-circle-fill'}
                  style={{
                    color: isEligible ? '#2e7d32' : '#c62828',
                    fontSize: '1rem',
                  }}
                ></i>
                <span
                  className="fw-bold"
                  style={{
                    color: isEligible ? '#2e7d32' : '#c62828',
                    fontSize: '0.88rem',
                  }}
                >
                  {isEligible ? 'Eligible for Coverage' : 'Not Eligible'}
                </span>
              </div>

              {/* Reason — only for Not Eligible, shown below pill */}
              {!isEligible && result.reason && (
                <div
                  className="mt-2 px-3 py-1 rounded-2 mx-auto"
                  style={{
                    background: '#fff3e0',
                    border: '1px solid #ffcc02',
                    fontSize: '0.75rem',
                    color: '#e65100',
                    maxWidth: 240,
                  }}
                >
                  <i className="bi bi-info-circle me-1"></i>
                  {result.reason}
                </div>
              )}
            </div>

            {/* Details card — matches the card style of the app */}
            <div
              className="rounded-3"
              style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
            >
              {[
                {
                  label: 'Remaining Benefit',
                  value: formatCurrency(result.remainingBenefit),
                  icon: 'bi-wallet2',
                },
                {
                  label: 'Deductible Met',
                  value: formatCurrency(result.deductibleMet),
                  icon: 'bi-receipt',
                },
                {
                  label: 'Pre-Auth Required',
                  value: result.preAuthRequired
                    ? <Badge bg="warning" text="dark">Yes</Badge>
                    : <Badge bg="success">No</Badge>,
                  icon: 'bi-file-check',
                },
              ].map((row, index, arr) => (
                <div
                  key={row.label}
                  className="d-flex align-items-center justify-content-between px-3"
                  style={{
                    padding: '9px 12px',
                    borderBottom: index < arr.length - 1
                      ? '1px solid #e9ecef' : 'none',
                  }}
                >
                  <div
                    className="d-flex align-items-center gap-2 text-muted"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>
                    {row.label}
                  </div>
                  <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Cache / live indicator */}
            <div
              className="text-center mt-2"
              style={{ fontSize: '0.68rem', color: '#9e9e9e' }}
            >
              <i className="bi bi-clock me-1"></i>
              {result.source === 'Cached'
                ? `Cached result · checked at ${new Date((result.checkedAt && !result.checkedAt.endsWith('Z') ? result.checkedAt + 'Z' : result.checkedAt)).toLocaleTimeString('en-IN')}`
                : `Live result · ${new Date((result.checkedAt && !result.checkedAt.endsWith('Z') ? result.checkedAt + 'Z' : result.checkedAt)).toLocaleTimeString('en-IN')}`}
            </div>
          </>
        )}

      </Modal.Body>

      <Modal.Footer className="border-0 pt-1">
        {!loading && result && (
          <Button
            variant="outline-success"
            size="sm"
            className="me-auto rounded-pill px-3"
            onClick={onRecheck}
            style={{ fontSize: '0.78rem' }}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Re-check
          </Button>
        )}
        <Button
          variant="light"
          size="sm"
          className="rounded-pill px-3"
          onClick={onHide}
          style={{ fontSize: '0.78rem' }}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}