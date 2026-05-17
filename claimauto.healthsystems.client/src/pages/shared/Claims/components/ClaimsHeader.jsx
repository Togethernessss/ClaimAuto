// src/pages/shared/Claims/components/ClaimsHeader.jsx
import { Alert, Button } from 'react-bootstrap';

export default function ClaimsHeader({
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  successMsg,
  onSubmitClick,        // Hospital — submit new claim
  onReimbursementClick, // Policyholder — submit reimbursement
}) {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-file-medical fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Claims</h3>
            <small className="text-muted">
              {isAdmin || isStaff
                ? 'All insurance claims across all providers and members'
                : isHospital
                ? 'Claims submitted by your facility'
                : 'Your insurance claims and reimbursement requests'}
            </small>
          </div>
        </div>

        {/* Action buttons — role-based */}
        <div className="d-flex gap-2 flex-wrap">
          {isHospital && (
            <Button
              variant="primary"
              className="rounded-pill px-4 fw-semibold"
              onClick={onSubmitClick}
            >
              <i className="bi bi-file-plus me-2"></i>
              Submit Claim
            </Button>
          )}

          {isPolicyholder && (
            <Button
              variant="primary"
              className="rounded-pill px-4 fw-semibold"
              onClick={onReimbursementClick}
            >
              <i className="bi bi-arrow-return-left me-2"></i>
              Request Reimbursement
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center py-2 mb-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}
    </>
  );
}
