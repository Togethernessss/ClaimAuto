import { Alert } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function RemittanceHeader({ successMsg, errorMsg }) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  return (
    <div className="px-4 pt-3 mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-receipt fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">
              {isHospital ? 'My Remittances' : 'Remittances'}
            </h3>
            <small className="text-muted">
              {isHospital
                ? 'Payment advices sent to your account — confirm receipt to close the loop'
                : 'Track payment advices — Generated → Sent → Acknowledged'}
            </small>
          </div>
        </div>
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