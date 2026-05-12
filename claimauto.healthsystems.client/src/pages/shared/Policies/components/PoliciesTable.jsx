import { Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate, statusVariant }
  from '../utils/policyHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS THIS?
// The main data table.
// Shows loading spinner / error / empty state / real rows.
// Action buttons are role-based:
//   Admin    → Edit + Deactivate
//   Staff    → View only label
//   Hospital → no actions column at all
// ─────────────────────────────────────────────────────────────────────────────

export default function PoliciesTable({
  policies,       // array  — filtered policies to display
  loading,        // boolean
  error,          // string | null
  isAdmin,        // boolean
  isHospital,     // boolean
  hasFilters,     // boolean — true if search/filter is active (for empty state msg)
  onRetry,        // function — called when Retry is clicked on error
  onEdit,         // function(policy) — opens edit modal
  onDeactivate,   // function(policy) — opens deactivate modal
  onCreateFirst,  // function — opens create modal (empty state button)
}) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">

        {/* ── LOADING ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">Loading policies...</div>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="p-4">
            <Alert
              variant="danger"
              className="d-flex align-items-center mb-0"
            >
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button
                variant="link"
                size="sm"
                className="ms-auto p-0 text-danger"
                onClick={onRetry}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Retry
              </Button>
            </Alert>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
        {!loading && !error && policies.length === 0 && (
          <div className="text-center py-5">
            <i
              className="bi bi-inbox"
              style={{ fontSize: 48, color: '#dfe4ea' }}
            ></i>
            <div className="fw-semibold text-muted mt-3">
              {hasFilters
                ? 'No policies match your filters'
                : 'No policies yet'}
            </div>
            {isAdmin && !hasFilters && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3 rounded-pill"
                onClick={onCreateFirst}
              >
                <i className="bi bi-plus-lg me-1"></i> Create First Policy
              </Button>
            )}
          </div>
        )}

        {/* ── TABLE ────────────────────────────────────────────────────── */}
        {!loading && !error && policies.length > 0 && (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">

              <thead style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6',
              }}>
                <tr>
                  <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">
                    Plan
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Deductible
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    OOP Max
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Effective From
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Effective To
                  </th>
                  {!isHospital && (
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Members
                    </th>
                  )}
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Status
                  </th>
                  {!isHospital && (
                    <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.policyID}>

                    {/* Plan name + code */}
                    <td className="ps-4 py-3">
                      <div className="fw-semibold">{policy.planName}</div>
                      <div className="text-muted small font-monospace">
                        {policy.planCode}
                      </div>
                    </td>

                    <td className="py-3">
                      {formatCurrency(policy.deductibleAmount)}
                    </td>
                    <td className="py-3">
                      {formatCurrency(policy.outOfPocketMax)}
                    </td>
                    <td className="py-3">
                      {formatDate(policy.effectiveFrom)}
                    </td>
                    <td className="py-3">
                      {formatDate(policy.effectiveTo)}
                    </td>

                    {/* Members count — hidden from Hospital */}
                    {!isHospital && (
                      <td className="py-3">
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-people me-1"></i>
                          {policy.memberCount ?? 0}
                        </span>
                      </td>
                    )}

                    {/* Status badge */}
                    <td className="py-3">
                      <Badge
                        bg={statusVariant(policy.status)}
                        className="px-3 py-2"
                      >
                        {policy.status}
                      </Badge>
                    </td>

                    {/* ── ACTION BUTTONS — stacked vertical ──────────── */}
                    {!isHospital && (
                      <td className="py-3 pe-4">
                        <div className="d-flex flex-column align-items-end gap-1">

                          {isAdmin ? (
                            <>
                              {/* EDIT BUTTON */}
                              <Button
                                size="sm"
                                onClick={() => onEdit(policy)}
                                style={{
                                  width: 110,
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
                                <i className="bi bi-pencil-fill" style={{ fontSize: '0.72rem' }}></i>
                                Edit Policy
                              </Button>

                              {/* DEACTIVATE BUTTON — only if not expired */}
                              {policy.status !== 'Expired' ? (
                                <Button
                                  size="sm"
                                  onClick={() => onDeactivate(policy)}
                                  style={{
                                    width: 110,
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    fontSize: '0.78rem',
                                    background: '#fdecea',
                                    border: '1.5px solid #e53935',
                                    color: '#b71c1c',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 5,
                                    padding: '5px 0',
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e53935';
                                    e.currentTarget.style.color = '#fff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fdecea';
                                    e.currentTarget.style.color = '#b71c1c';
                                  }}
                                >
                                  <i className="bi bi-slash-circle-fill" style={{ fontSize: '0.72rem' }}></i>
                                  Deactivate
                                </Button>
                              ) : (
                                /* Already expired — no action */
                                <span
                                  style={{
                                    width: 110,
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: '#f5f5f5',
                                    border: '1.5px solid #bdbdbd',
                                    color: '#9e9e9e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 5,
                                    padding: '5px 0',
                                  }}
                                >
                                  <i className="bi bi-lock-fill" style={{ fontSize: '0.72rem' }}></i>
                                  Expired
                                </span>
                              )}
                            </>
                          ) : (
                            /* InsuranceStaff — read only */
                            <span
                              style={{
                                fontSize: '0.78rem',
                                color: '#9e9e9e',
                                fontStyle: 'italic',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <i className="bi bi-eye"></i>
                              View only
                            </span>
                          )}

                        </div>
                      </td>
                    )}

                  </tr>
                ))}
              </tbody>

            </Table>
          </div>
        )}

      </Card.Body>
    </Card>
  );
}