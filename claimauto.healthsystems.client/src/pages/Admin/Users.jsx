import { useState, useEffect, useCallback } from 'react';
import {
  Container, Card, Button, Alert, Spinner, Badge,
  Table, Form, InputGroup, Modal, Row, Col,
} from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import InviteUserModal from '../../components/identity/InviteUserModal';
import { getAllUsers, updateUserStatus } from '../../services/identity/userService';

const ROLE_BADGE = {
  Admin:          { bg: 'danger',  label: 'Admin' },
  InsuranceStaff: { bg: 'primary', label: 'Staff' },
  Hospital:       { bg: 'info',    label: 'Hospital' },
  Policyholder:   { bg: 'success', label: 'Policyholder' },
};

export default function AdminUsers() {
  const { user: me } = useAuth();

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);

  // Filters
  const [searchText,   setSearchText]   = useState('');
  const [roleFilter,   setRoleFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);

  // Deactivation confirmation modal
  const [confirmTarget,  setConfirmTarget]  = useState(null); // user object
  const [confirmAction,  setConfirmAction]  = useState(null); // "Active" | "Inactive"
  const [toggling,       setToggling]       = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load users.';
      setError(typeof msg === 'string' ? msg : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auto-clear success toast
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // ── Status toggle ─────────────────────────────────────────────
  const openConfirm = (targetUser) => {
    const action = targetUser.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmTarget(targetUser);
    setConfirmAction(action);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget || !confirmAction) return;
    setToggling(true);
    try {
      await updateUserStatus(confirmTarget.userID, confirmAction);
      setSuccess(
        confirmAction === 'Inactive'
          ? `${confirmTarget.name} has been deactivated and will be logged out automatically.`
          : `${confirmTarget.name}'s account has been reactivated.`
      );
      setConfirmTarget(null);
      setConfirmAction(null);
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to update status.';
      setError(typeof msg === 'string' ? msg : 'Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchText =
      !searchText ||
      u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchText.toLowerCase());
    const matchRole   = roleFilter   === 'All' || u.role   === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchText && matchRole && matchStatus;
  });

  const totalActive   = users.filter((u) => u.status === 'Active').length;
  const totalInactive = users.filter((u) => u.status === 'Inactive').length;

  return (
    <Container fluid className="py-4">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: '#4a4a8a' }}>
            <i className="bi bi-people-fill me-2"></i>User Management
          </h4>
          <p className="text-muted small mb-0 mt-1">
            Manage all stakeholders in your organisation — activate or deactivate accounts as needed.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowInvite(true)}
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
        >
          <i className="bi bi-envelope-plus me-2"></i>Invite User
        </Button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center py-3">
            <div className="fw-bold fs-4" style={{ color: '#667eea' }}>{users.length}</div>
            <div className="text-muted small">Total Users</div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center py-3">
            <div className="fw-bold fs-4 text-success">{totalActive}</div>
            <div className="text-muted small">Active</div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center py-3">
            <div className="fw-bold fs-4 text-danger">{totalInactive}</div>
            <div className="text-muted small">Inactive</div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center py-3">
            <div className="fw-bold fs-4 text-primary">
              {users.filter((u) => u.role === 'Admin').length}
            </div>
            <div className="text-muted small">Admins</div>
          </Card>
        </Col>
      </Row>

      {/* ── Alerts ────────────────────────────────────────────── */}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="d-flex align-items-center">
          <i className="bi bi-check-circle-fill me-2"></i>{success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </Alert>
      )}

      {/* ── Filter bar ────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-2">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  className="border-start-0"
                  placeholder="Search by name or email…"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="InsuranceStaff">Insurance Staff</option>
                <option value="Hospital">Hospital</option>
                <option value="Policyholder">Policyholder</option>
              </Form.Select>
            </Col>
            <Col xs={6} md={2}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={2} className="text-md-end">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => { setSearchText(''); setRoleFilter('All'); setStatusFilter('All'); }}
              >
                <i className="bi bi-x-circle me-1"></i>Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Users table ───────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="text-muted mt-2 small">Loading users…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              No users match your filters.
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle" style={{ fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8f7ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">MFA</th>
                  <th className="px-3 py-3">Joined</th>
                  <th className="px-3 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.userID === me?.userID;
                  const isActive = u.status === 'Active';
                  const roleBadge = ROLE_BADGE[u.role] || { bg: 'secondary', label: u.role };

                  return (
                    <tr key={u.userID} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td className="px-3">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="d-inline-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                            style={{
                              width: 34, height: 34, fontSize: 13,
                              background: isActive
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : '#adb5bd',
                            }}
                          >
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div>
                            <div className="fw-semibold lh-sm">{u.name}</div>
                            {isSelf && (
                              <small className="text-muted">(you)</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 text-muted">{u.email}</td>
                      <td className="px-3">
                        <Badge bg={roleBadge.bg} className="fw-normal">
                          {roleBadge.label}
                        </Badge>
                      </td>
                      <td className="px-3">
                        <span
                          className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill"
                          style={{
                            fontSize: 12, fontWeight: 600,
                            background: isActive ? '#d1fae5' : '#fee2e2',
                            color:      isActive ? '#065f46' : '#991b1b',
                          }}
                        >
                          <span
                            className="rounded-circle"
                            style={{ width: 7, height: 7, background: isActive ? '#10b981' : '#ef4444', display: 'inline-block' }}
                          />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3">
                        {u.mfaEnabled
                          ? <span className="text-success small"><i className="bi bi-shield-check me-1"></i>On</span>
                          : <span className="text-muted small"><i className="bi bi-shield me-1"></i>Off</span>
                        }
                      </td>
                      <td className="px-3 text-muted small">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 text-end">
                        {isSelf ? (
                          <span className="text-muted small">—</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isActive ? 'outline-danger' : 'outline-success'}
                            onClick={() => openConfirm(u)}
                            title={isActive ? 'Deactivate account' : 'Reactivate account'}
                          >
                            {isActive ? (
                              <><i className="bi bi-person-dash me-1"></i>Deactivate</>
                            ) : (
                              <><i className="bi bi-person-check me-1"></i>Activate</>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
        {!loading && filtered.length > 0 && (
          <Card.Footer className="bg-transparent text-muted small py-2 px-3">
            Showing {filtered.length} of {users.length} users
          </Card.Footer>
        )}
      </Card>

      {/* ── Confirmation modal ────────────────────────────────── */}
      <Modal show={!!confirmTarget} onHide={() => !toggling && setConfirmTarget(null)} centered>
        <Modal.Header closeButton={!toggling}>
          <Modal.Title>
            {confirmAction === 'Inactive' ? (
              <><i className="bi bi-person-dash text-danger me-2"></i>Deactivate Account</>
            ) : (
              <><i className="bi bi-person-check text-success me-2"></i>Activate Account</>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmAction === 'Inactive' ? (
            <>
              <p>
                Are you sure you want to <strong>deactivate</strong>{' '}
                <strong>{confirmTarget?.name}</strong>?
              </p>
              <Alert variant="warning" className="small mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This user will be <strong>logged out automatically</strong> and will see a message
                to contact support. They will not be able to log in until reactivated.
              </Alert>
            </>
          ) : (
            <p>
              Reactivate <strong>{confirmTarget?.name}</strong>? They will regain full access
              to the platform immediately.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={toggling}>
            Cancel
          </Button>
          <Button
            variant={confirmAction === 'Inactive' ? 'danger' : 'success'}
            onClick={handleConfirmToggle}
            disabled={toggling}
          >
            {toggling ? (
              <><Spinner animation="border" size="sm" className="me-1" />Processing…</>
            ) : confirmAction === 'Inactive' ? (
              <><i className="bi bi-person-dash me-1"></i>Yes, Deactivate</>
            ) : (
              <><i className="bi bi-person-check me-1"></i>Yes, Activate</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Invite user modal ─────────────────────────────────── */}
      <InviteUserModal
        show={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={() => { setShowInvite(false); fetchUsers(); }}
      />
    </Container>
  );
}
