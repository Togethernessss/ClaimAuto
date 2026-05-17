import { Alert, Button } from 'react-bootstrap';

export default function MembersHeader({
  isAdmin,        // boolean — Admin + Staff can create
  isStaff,        // boolean
  successMsg,     // string | null
  totalCount,     // number — for subtitle
  onCreateClick,  // function
}) {
  const canCreate = isAdmin || isStaff;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-people fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Members</h3>
            <small className="text-muted">
              Enrolled members across all insurance policies
            </small>
          </div>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            className="rounded-pill px-4 fw-semibold"
            onClick={onCreateClick}
          >
            <i className="bi bi-person-plus me-2"></i>
            Enroll Member
          </Button>
        )}
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