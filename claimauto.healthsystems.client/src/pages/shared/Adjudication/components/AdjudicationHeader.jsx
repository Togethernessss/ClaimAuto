// src/pages/shared/Adjudication/components/AdjudicationHeader.jsx
import { Alert } from 'react-bootstrap';

export default function AdjudicationHeader({ successMsg, errorMsg }) {
  return (
    <>
      {/* Title row — matches Policies/Members/Claims pattern */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-check2-square fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Adjudication</h3>
            <small className="text-muted">
              Review claim outcomes and manage manual decisions
            </small>
          </div>
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
