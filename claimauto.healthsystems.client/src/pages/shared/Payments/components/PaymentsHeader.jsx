import { Alert } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function PaymentsHeader({
  successMsg,
  errorMsg,
  onCreateClick,
}) {
  const { user } = useAuth();
  const isStaff = canAccess(user?.role, ['InsuranceStaff']);

  return (
    <div className="px-4 pt-3 mb-4">

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-credit-card fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Payments</h3>
            <small className="text-muted">
              Manage claim disbursements — Pending → Authorized → Executed
            </small>
          </div>
        </div>

        {isStaff && (
          <button
            className="btn fw-semibold text-white rounded-pill px-4"
            onClick={onCreateClick}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            <i className="bi bi-plus-lg me-2"></i>
            New Payment
          </button>
        )}
      </div>

      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMsg}
        </Alert>
      )}
    </div>
  );
}