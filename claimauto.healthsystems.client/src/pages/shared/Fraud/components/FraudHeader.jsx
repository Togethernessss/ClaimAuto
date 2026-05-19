// src/pages/shared/Fraud/components/FraudHeader.jsx
import { Alert, Button } from 'react-bootstrap';

export default function FraudHeader({
  onScoreClaim,  // open Score a Claim modal
  onOpenCase,    // open Open Case Manually modal
  successMsg,
  errorMsg,
}) {
  return (
    <>
      {/* Title row — identical structure to PoliciesHeader */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-shield-exclamation fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Fraud Detection</h3>
            <small className="text-muted">
              Score claims for fraud risk, investigate cases, and resolve outcomes
            </small>
          </div>
        </div>

        {/* Two action buttons */}
        <div className="d-flex gap-2">
          <Button
            variant="outline-danger"
            className="rounded-pill px-4 fw-semibold"
            onClick={onOpenCase}
          >
            <i className="bi bi-folder-plus me-2"></i>Open Case
          </Button>
          <Button
            variant="primary"
            className="rounded-pill px-4 fw-semibold"
            onClick={onScoreClaim}
          >
            <i className="bi bi-speedometer2 me-2"></i>Score a Claim
          </Button>
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center py-2 mb-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" className="d-flex align-items-center py-2 mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMsg}
        </Alert>
      )}
    </>
  );
}
