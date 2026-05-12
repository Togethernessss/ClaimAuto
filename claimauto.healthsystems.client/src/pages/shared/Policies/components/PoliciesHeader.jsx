import { Alert, Button } from 'react-bootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS THIS?
// The top section of the Policies page.
// Contains: page title, subtitle, "New Policy" button, success toast.
// Receives everything it needs via props from Policies.jsx.
// ─────────────────────────────────────────────────────────────────────────────

export default function PoliciesHeader({
  isAdmin,        // boolean — show/hide the Create button
  isHospital,     // boolean — show different subtitle
  successMsg,     // string | null — green toast message
  onCreateClick,  // function — called when Create button is clicked
}) {
  return (
    <>
      {/* Title row */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-shield-check fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Policies</h3>
            <small className="text-muted">
              {isHospital
                ? 'Active insurance plans available for claim submission'
                : 'Manage insurance plans — deductibles, coverage, effective dates'}
            </small>
          </div>
        </div>

        {/* Only Admin sees this button */}
        {isAdmin && (
          <Button
            variant="primary"
            className="rounded-pill px-4 fw-semibold"
            onClick={onCreateClick}
          >
            <i className="bi bi-plus-lg me-2"></i>
            New Policy
          </Button>
        )}
      </div>

      {/* Success toast — auto-disappears (controlled by parent) */}
      {successMsg && (
        <Alert
          variant="success"
          className="d-flex align-items-center py-2 mb-3"
        >
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}
    </>
  );
}