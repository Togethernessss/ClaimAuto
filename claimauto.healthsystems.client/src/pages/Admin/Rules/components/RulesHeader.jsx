// src/pages/Admin/Rules/components/RulesHeader.jsx
import { Alert } from 'react-bootstrap';

export default function RulesHeader({ successMsg, onCreateClick }) {
  return (
    <>
      {/* Title row — same pattern as PoliciesHeader */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-gear fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Rules Engine</h3>
            <small className="text-muted">
              Manage adjudication rules — Draft → Active → Inactive
            </small>
          </div>
        </div>

        <button
          onClick={onCreateClick}
          className="btn btn-primary rounded-pill px-4 fw-semibold"
        >
          <i className="bi bi-plus-lg me-2"></i>
          New Rule
        </button>
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
