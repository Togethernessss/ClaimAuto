import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Modal, Form, Alert, Spinner, InputGroup,
} from 'react-bootstrap';
import { useAuth }         from '../../security/AuthContext';
import { canAccess }       from '../../security/permissions';
import {
  getAllPolicies,
  getActivePolicies,
  createPolicy,
  updatePolicy,
  deactivatePolicy,
} from '../../services/policies/policyService';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
} from '../../models/policies/PolicyDto';


// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// Small utility functions used inside the page.
// Defined OUTSIDE the component so they don't re-create on every render.
// ─────────────────────────────────────────────────────────────────────────────

// Converts a number to Indian Rupee format
// Example: 5000  → "₹5,000"
// Example: null  → "—"
function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// Converts an ISO date string to readable format
// Example: "2024-01-01T00:00:00" → "Jan 01, 2024"
// Example: null → "—"
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

// Returns the Bootstrap badge colour for each status
// Example: "Active" → "success" (green badge)
function statusVariant(status) {
  switch (status) {
    case 'Active':    return 'success';
    case 'Expired':   return 'secondary';
    case 'Suspended': return 'warning';
    default:          return 'secondary';
  }
}

// Empty form objects — used to reset forms after close
// Defined here so they're created once, not on every render
const EMPTY_CREATE = new CreatePolicyDto();
const EMPTY_UPDATE = new UpdatePolicyDto();

// ─────────────────────────────────────────────────────────────────────────────
// THE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Policies() {

  // ── WHO IS LOGGED IN? ──────────────────────────────────────────────────────
  const { user } = useAuth();
  // user.role is one of: 'Admin', 'InsuranceStaff', 'Hospital', 'Policyholder'

  // ── WHAT CAN THIS ROLE DO? ────────────────────────────────────────────────
  const isAdmin    = canAccess(user?.role, ['Admin']);
  const isHospital = canAccess(user?.role, ['Hospital']);
  // isAdmin    → true only for Admin
  // isHospital → true only for Hospital
  // InsuranceStaff → both false (read-only view)

  // ── STATE: THE LIST ───────────────────────────────────────────────────────
  const [policies,      setPolicies]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const [successMsg,    setSuccessMsg]   = useState(null);

  // ── STATE: FILTERS ────────────────────────────────────────────────────────
  const [search,        setSearch]       = useState('');
  const [statusFilter,  setStatusFilter] = useState('All');

  // ── STATE: CREATE MODAL ───────────────────────────────────────────────────
  const [showCreate,    setShowCreate]   = useState(false);
  const [createForm,    setCreateForm]   = useState(EMPTY_CREATE);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]  = useState(null);

  // ── STATE: EDIT MODAL ─────────────────────────────────────────────────────
  const [showEdit,      setShowEdit]     = useState(false);
  const [editTarget,    setEditTarget]   = useState(null);
  const [editForm,      setEditForm]     = useState(EMPTY_UPDATE);
  const [editLoading,   setEditLoading]  = useState(false);
  const [editError,     setEditError]    = useState(null);

  // ── STATE: DEACTIVATE MODAL ───────────────────────────────────────────────
  const [showDeactivate,    setShowDeactivate]   = useState(false);
  const [deactivateTarget,  setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError,   setDeactivateError]  = useState(null);


  // ── LOAD DATA ─────────────────────────────────────────────────────────────
  // useCallback wraps the function so it doesn't get recreated on every render
  // Hospital role only sees active policies (for claim submission dropdown)
  // Admin and InsuranceStaff see all policies
  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isHospital
        ? await getActivePolicies()   // Hospital → active only
        : await getAllPolicies();     // Admin/Staff → all policies
      setPolicies(data);
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to load policies.';
      setError(typeof msg === 'string' ? msg : 'Failed to load policies.');
    } finally {
      setLoading(false);
    }
  }, [isHospital]);

  // Run loadPolicies when the page first opens
  // The [loadPolicies] dependency means: re-run if loadPolicies changes
  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(timer);  // cleanup — cancel if component closes
  }, [successMsg]);

  // ── FILTERED LIST ─────────────────────────────────────────────────────────
  // This runs every render — filters the policies array in memory
  // Does NOT call the API again — just filters what we already have
  const filtered = policies.filter((p) => {
    const matchSearch =
      p.planCode?.toLowerCase().includes(search.toLowerCase()) ||
      p.planName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── CREATE HANDLERS ───────────────────────────────────────────────────────

  // Generic field updater — works for any form field
  // Usage: onChange={handleCreateField('planName')}
  const handleCreateField = (field) => (e) =>
    setCreateForm({ ...createForm, [field]: e.target.value });
  //               ↑ spread existing form, then update only the changed field

  const handleCreateSubmit = async (e) => {
    e.preventDefault();   // stop browser from refreshing the page
    setCreateError(null);
    setCreateLoading(true);
    try {
      // Build the payload — convert empty strings to null for optional fields
      // Backend expects null not "" for optional numbers and dates
      const payload = {
        planCode:          createForm.planCode,
        planName:          createForm.planName,
        coverageRulesJSON: createForm.coverageRulesJSON || null,
        deductibleAmount:  createForm.deductibleAmount !== ''
                             ? Number(createForm.deductibleAmount)
                             : null,
        outOfPocketMax:    createForm.outOfPocketMax !== ''
                             ? Number(createForm.outOfPocketMax)
                             : null,
        effectiveFrom:     createForm.effectiveFrom,
        effectiveTo:       createForm.effectiveTo || null,
      };
      await createPolicy(payload);
      setShowCreate(false);          // close the modal
      setCreateForm(EMPTY_CREATE);   // reset the form
      setSuccessMsg('Policy created successfully.');
      loadPolicies();                // refresh the table
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to create policy.';
      setCreateError(typeof msg === 'string' ? msg : 'Failed to create policy.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── EDIT HANDLERS ─────────────────────────────────────────────────────────

  // Called when user clicks the Edit button on a row
  // Populates the edit form with that policy's current values
  const openEdit = (policy) => {
    setEditTarget(policy);
    setEditForm(new UpdatePolicyDto({
      planName:          policy.planName          ?? '',
      coverageRulesJSON: policy.coverageRulesJSON ?? '',
      deductibleAmount:  policy.deductibleAmount  ?? '',
      outOfPocketMax:    policy.outOfPocketMax    ?? '',
      // effectiveTo comes as "2025-12-31T00:00:00" — cut off the time part
      effectiveTo:       policy.effectiveTo
                           ? policy.effectiveTo.split('T')[0]
                           : '',
      status:            policy.status ?? '',
    }));
    setEditError(null);
    setShowEdit(true);
  };

  const handleEditField = (field) => (e) =>
    setEditForm({ ...editForm, [field]: e.target.value });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    try {
      const payload = {
        planName:          editForm.planName          || null,
        coverageRulesJSON: editForm.coverageRulesJSON || null,
        deductibleAmount:  editForm.deductibleAmount !== ''
                             ? Number(editForm.deductibleAmount)
                             : null,
        outOfPocketMax:    editForm.outOfPocketMax !== ''
                             ? Number(editForm.outOfPocketMax)
                             : null,
        effectiveTo:       editForm.effectiveTo || null,
        status:            editForm.status      || null,
      };
      await updatePolicy(editTarget.policyID, payload);
      setShowEdit(false);
      setSuccessMsg(`Policy "${editTarget.planName}" updated successfully.`);
      loadPolicies();
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to update policy.';
      setEditError(typeof msg === 'string' ? msg : 'Failed to update policy.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── DEACTIVATE HANDLERS ───────────────────────────────────────────────────

  const openDeactivate = (policy) => {
    setDeactivateTarget(policy);
    setDeactivateError(null);
    setShowDeactivate(true);
  };

  const handleDeactivateConfirm = async () => {
    setDeactivateError(null);
    setDeactivateLoading(true);
    try {
      await deactivatePolicy(deactivateTarget.policyID);
      setShowDeactivate(false);
      setSuccessMsg(`Policy "${deactivateTarget.planName}" deactivated.`);
      loadPolicies();
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to deactivate.';
      setDeactivateError(typeof msg === 'string' ? msg : 'Failed to deactivate.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <Container fluid>

      {/* PAGE HEADER */}
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
        {/* Only Admin sees the Create button */}
        {isAdmin && (
          <Button
            variant="primary"
            className="rounded-pill px-4 fw-semibold"
            onClick={() => {
              setCreateForm(EMPTY_CREATE);
              setCreateError(null);
              setShowCreate(true);
            }}
          >
            <i className="bi bi-plus-lg me-2"></i> New Policy
          </Button>
        )}
      </div>

      {/* SUCCESS TOAST — auto-disappears after 3s */}
      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center py-2 mb-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}

      {/* FILTERS — hidden for Hospital (they only see active anyway) */}
      {!isHospital && (
        <Row className="g-3 mb-4">
          <Col md={6} lg={5}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </InputGroup.Text>
              <Form.Control
                className="border-start-0 ps-0"
                placeholder="Search by plan code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button variant="outline-secondary" onClick={() => setSearch('')}>
                  <i className="bi bi-x"></i>
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </Form.Select>
          </Col>
          <Col className="d-flex align-items-center">
            <span className="text-muted small">
              {!loading && `${filtered.length} of ${policies.length} policies`}
            </span>
          </Col>
        </Row>
      )}

      {/* SUMMARY CARDS — hidden for Hospital */}
      {!isHospital && (
        <Row className="g-3 mb-4">
          {[
            {
              label: 'Total Policies',
              val:   policies.length,
              icon:  'bi-shield-check',
              bg:    '#e3f2fd',
              color: '#1565c0',
            },
            {
              label: 'Active',
              val:   policies.filter((p) => p.status === 'Active').length,
              icon:  'bi-check-circle',
              bg:    '#d1f2eb',
              color: '#2e7d32',
            },
            {
              label: 'Expired',
              val:   policies.filter((p) => p.status === 'Expired').length,
              icon:  'bi-calendar-x',
              bg:    '#f5f5f5',
              color: '#757575',
            },
            {
              label: 'Total Enrolled',
              val:   policies.reduce((sum, p) => sum + (p.memberCount ?? 0), 0),
              icon:  'bi-people-fill',
              bg:    '#fff3e0',
              color: '#e65100',
            },
          ].map((s) => (
            <Col xs={6} lg={3} key={s.label}>
              <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex align-items-center gap-3 py-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 44, height: 44, backgroundColor: s.bg }}
                  >
                    <i className={`${s.icon} fs-5`} style={{ color: s.color }}></i>
                  </div>
                  <div>
                    <div className="fw-bold fs-5 mb-0 lh-1">{s.val}</div>
                    <div className="text-muted small">{s.label}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* MAIN TABLE CARD */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">

          {/* Loading spinner */}
          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted small">Loading policies...</div>
            </div>
          )}

          {/* Error message */}
          {!loading && error && (
            <div className="p-4">
              <Alert variant="danger" className="d-flex align-items-center mb-0">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <Button
                  variant="link"
                  size="sm"
                  className="ms-auto p-0"
                  onClick={loadPolicies}
                >
                  Retry
                </Button>
              </Alert>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-5">
              <i
                className="bi bi-inbox"
                style={{ fontSize: 48, color: '#dfe4ea' }}
              ></i>
              <div className="fw-semibold text-muted mt-3">
                {search || statusFilter !== 'All'
                  ? 'No policies match your filters'
                  : 'No policies yet'}
              </div>
              {isAdmin && !search && statusFilter === 'All' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3 rounded-pill"
                  onClick={() => setShowCreate(true)}
                >
                  <i className="bi bi-plus-lg me-1"></i> Create First Policy
                </Button>
              )}
            </div>
          )}

          {/* TABLE */}
          {!loading && !error && filtered.length > 0 && (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #dee2e6',
                  }}
                >
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
                    {/* Hide member count from Hospital */}
                    {!isHospital && (
                      <th className="py-3 text-muted small fw-semibold text-uppercase">
                        Members
                      </th>
                    )}
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Status
                    </th>
                    {/* Actions column — only Admin and Staff */}
                    {!isHospital && (
                      <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((policy) => (
                    <tr key={policy.policyID}>
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
                      <td className="py-3">{formatDate(policy.effectiveFrom)}</td>
                      <td className="py-3">{formatDate(policy.effectiveTo)}</td>
                      {!isHospital && (
                        <td className="py-3">
                          <span className="badge bg-light text-dark border">
                            <i className="bi bi-people me-1"></i>
                            {policy.memberCount ?? 0}
                          </span>
                        </td>
                      )}
                      <td className="py-3">
                        <Badge
                          bg={statusVariant(policy.status)}
                          className="px-3 py-2"
                        >
                          {policy.status}
                        </Badge>
                      </td>
                      {/* Action buttons — role based */}
                      {!isHospital && (
                        <td className="py-3 pe-4 text-end">
                          {isAdmin && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2 rounded-pill"
                              onClick={() => openEdit(policy)}
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </Button>
                          )}
                          {isAdmin && policy.status !== 'Expired' && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-pill"
                              onClick={() => openDeactivate(policy)}
                            >
                              <i className="bi bi-x-circle me-1"></i> Deactivate
                            </Button>
                          )}
                          {!isAdmin && (
                            <span className="text-muted small fst-italic">
                              View only
                            </span>
                          )}
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


      {/* ══════════════════════════════════════════════════════════════════════
          CREATE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-plus-circle text-primary me-2"></i>
            Create New Policy
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body className="pt-3">
            {createError && (
              <Alert variant="danger" className="d-flex align-items-center py-2">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {createError}
              </Alert>
            )}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Plan Code <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    placeholder="e.g. FAMILY-GOLD-2025"
                    value={createForm.planCode}
                    onChange={handleCreateField('planCode')}
                    required
                  />
                  <Form.Text className="text-muted">
                    Unique. Cannot be changed after creation.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Plan Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    placeholder="e.g. Family Gold Health Plan"
                    value={createForm.planName}
                    onChange={handleCreateField('planName')}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Deductible Amount (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={createForm.deductibleAmount}
                    onChange={handleCreateField('deductibleAmount')}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Out-of-Pocket Max (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 100000"
                    value={createForm.outOfPocketMax}
                    onChange={handleCreateField('outOfPocketMax')}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Effective From <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={createForm.effectiveFrom}
                    onChange={handleCreateField('effectiveFrom')}
                    required
                  />
                  <Form.Text className="text-muted">
                    Cannot be changed after creation.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Effective To
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={createForm.effectiveTo}
                    onChange={handleCreateField('effectiveTo')}
                  />
                  <Form.Text className="text-muted">
                    Leave blank for auto-renewing plans.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Coverage Rules (JSON)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder='{"coveredServices":["inpatient","outpatient","pharmacy"]}'
                    value={createForm.coverageRulesJSON}
                    onChange={handleCreateField('coverageRulesJSON')}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <Form.Text className="text-muted">Optional.</Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button
              variant="light"
              onClick={() => setShowCreate(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-4 fw-semibold"
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-2"></i>
                  Create Policy
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>


      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            <i className="bi bi-pencil text-warning me-2"></i>
            Edit Policy
          </Modal.Title>
        </Modal.Header>

        {editTarget && (
          <Form onSubmit={handleEditSubmit}>
            <Modal.Body className="pt-3">
              <Alert variant="info" className="py-2 small mb-3">
                <i className="bi bi-lock-fill me-2"></i>
                <strong>Plan Code</strong> ({editTarget.planCode}) and{' '}
                <strong>Effective From</strong> (
                {formatDate(editTarget.effectiveFrom)}) are locked.
              </Alert>
              {editError && (
                <Alert
                  variant="danger"
                  className="d-flex align-items-center py-2"
                >
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {editError}
                </Alert>
              )}
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Plan Name
                    </Form.Label>
                    <Form.Control
                      value={editForm.planName}
                      onChange={handleEditField('planName')}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Status</Form.Label>
                    <Form.Select
                      value={editForm.status}
                      onChange={handleEditField('status')}
                    >
                      <option value="">— no change —</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Expired">Expired</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Deductible (₹)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.deductibleAmount}
                      onChange={handleEditField('deductibleAmount')}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      OOP Max (₹)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.outOfPocketMax}
                      onChange={handleEditField('outOfPocketMax')}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Effective To
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={editForm.effectiveTo}
                      onChange={handleEditField('effectiveTo')}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Coverage Rules (JSON)
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={editForm.coverageRulesJSON}
                      onChange={handleEditField('coverageRulesJSON')}
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer className="border-0">
              <Button
                variant="light"
                onClick={() => setShowEdit(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="warning"
                className="px-4 fw-semibold"
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>


      {/* ══════════════════════════════════════════════════════════════════════
          DEACTIVATE CONFIRM MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        show={showDeactivate}
        onHide={() => setShowDeactivate(false)}
        backdrop="static"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Deactivate Policy
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deactivateTarget && (
            <>
              <p className="mb-2">
                Are you sure you want to deactivate{' '}
                <strong>{deactivateTarget.planName}</strong>{' '}
                <span className="text-muted font-monospace small">
                  ({deactivateTarget.planCode})
                </span>
                ?
              </p>
              <Alert variant="warning" className="small py-2">
                <i className="bi bi-info-circle me-2"></i>
                This sets the policy to <strong>Expired</strong>. The row is
                never deleted. This will fail if there are active members
                enrolled under this policy.
              </Alert>
            </>
          )}
          {deactivateError && (
            <Alert variant="danger" className="py-2 small">
              <i className="bi bi-x-circle me-2"></i>
              {deactivateError}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="light"
            onClick={() => setShowDeactivate(false)}
            disabled={deactivateLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="px-4 fw-semibold"
            onClick={handleDeactivateConfirm}
            disabled={deactivateLoading}
          >
            {deactivateLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deactivating...
              </>
            ) : (
              <>
                <i className="bi bi-x-circle me-2"></i>
                Yes, Deactivate
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
}