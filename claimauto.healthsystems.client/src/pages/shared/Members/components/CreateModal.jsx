import { useState, useEffect, useRef }     from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, ListGroup } from 'react-bootstrap';

export default function CreateModal({
  show,
  loading,
  error,
  form,
  policies,
  policyholderUsers,
  onHide,
  onFieldChange,
  onUserSelect,
  onSubmit,
}) {
  const [userSearch, setUserSearch] = useState('');
  const [isOpen, setIsOpen]         = useState(false);
  const dropdownRef                  = useRef(null);

  // Reset dropdown when modal closes
  useEffect(() => {
    if (!show) { setIsOpen(false); setUserSearch(''); }
  }, [show]);

  // Close when clicking outside the dropdown
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const filteredUsers = (policyholderUsers || []).filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = (policyholderUsers || []).find(
    (u) => String(u.userID) === String(form.policyholderUserID)
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-person-plus text-primary me-2"></i>
          Enroll New Member
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={onSubmit}>
        <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">

            {/* ── Policyholder User Selection (click-to-open) ── */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Link to Registered User <span className="text-danger">*</span>
                </Form.Label>

                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  {/* Trigger */}
                  <div
                    onClick={() => setIsOpen((o) => !o)}
                    className="form-control d-flex align-items-center justify-content-between"
                    style={{ cursor: 'pointer', minHeight: 38 }}
                  >
                    {selectedUser ? (
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-person-circle text-primary"></i>
                        <span className="fw-semibold small">{selectedUser.name}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {selectedUser.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted small">— Select a Policyholder user —</span>
                    )}
                    <i
                      className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-muted ms-2`}
                      style={{ fontSize: '0.75rem' }}
                    />
                  </div>

                  {/* Dropdown panel */}
                  {isOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%', left: 0, right: 0,
                        zIndex: 1050,
                        background: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        marginTop: 4,
                      }}
                    >
                      <div className="p-2 border-bottom">
                        <Form.Control
                          autoFocus
                          size="sm"
                          type="text"
                          placeholder="Search by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filteredUsers.length === 0 ? (
                          <div className="text-muted small p-3 text-center">
                            {userSearch
                              ? 'No users match your search'
                              : 'No registered Policyholder users found'}
                          </div>
                        ) : (
                          <ListGroup variant="flush">
                            {filteredUsers.map((u) => {
                              const isSelected =
                                String(form.policyholderUserID) === String(u.userID);
                              return (
                                <ListGroup.Item
                                  key={u.userID}
                                  action
                                  active={isSelected}
                                  onClick={() => {
                                    onUserSelect(u);
                                    setIsOpen(false);
                                    setUserSearch('');
                                  }}
                                  className="d-flex align-items-center gap-2 py-2"
                                  style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                  <i className="bi bi-person-circle text-primary"></i>
                                  <div>
                                    <div className="fw-semibold">{u.name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                      {u.email}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <i className="bi bi-check-circle-fill text-white ms-auto"></i>
                                  )}
                                </ListGroup.Item>
                              );
                            })}
                          </ListGroup>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden native select keeps browser required-field validation */}
                <Form.Select
                  value={form.policyholderUserID}
                  onChange={onFieldChange('policyholderUserID')}
                  required
                  style={{ display: 'none' }}
                  aria-hidden="true"
                >
                  <option value=""></option>
                  {(policyholderUsers || []).map((u) => (
                    <option key={u.userID} value={u.userID}>{u.name}</option>
                  ))}
                </Form.Select>

                <Form.Text className="text-muted">
                  The member record will be linked to this user's account.
                  {form.policyholderUserID && (
                    <span className="text-success ms-2">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Name and email auto-filled from registration data.
                    </span>
                  )}
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Policy dropdown ── */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Policy <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.policyID}
                  onChange={onFieldChange('policyID')}
                  required
                >
                  <option value="">— Select a policy —</option>
                  {policies.map((p) => (
                    <option key={p.policyID} value={p.policyID}>
                      {p.planName} ({p.planCode})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Full Name ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Full Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="e.g. Arjun Sharma"
                  value={form.name}
                  onChange={onFieldChange('name')}
                  required
                  minLength={2}
                />
              </Form.Group>
            </Col>

            {/* ── Date of Birth ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Date of Birth <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.dob}
                  onChange={onFieldChange('dob')}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Gender ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Gender <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.gender}
                  onChange={onFieldChange('gender')}
                  required
                >
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Coverage Start ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Coverage Start <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.coverageStart}
                  onChange={onFieldChange('coverageStart')}
                  required
                />
              </Form.Group>
            </Col>

            {/* ── Coverage End ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Coverage End
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.coverageEnd}
                  onChange={onFieldChange('coverageEnd')}
                  min={form.coverageStart || undefined}
                />
                <Form.Text className="text-muted">
                  Leave blank for open-ended coverage.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Phone ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Phone</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="e.g. 9000000000"
                  value={form.contactPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    onFieldChange('contactPhone')({ target: { value: digits } });
                  }}
                  maxLength={10}
                />
              </Form.Group>
            </Col>

            {/* ── Email ── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="e.g. member@example.com"
                  value={form.contactEmail}
                  onChange={onFieldChange('contactEmail')}
                />
              </Form.Group>
            </Col>

            {/* ── Address ── */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Address</Form.Label>
                <Form.Control
                  placeholder="e.g. 123 MG Road, Mumbai"
                  value={form.contactAddress}
                  onChange={onFieldChange('contactAddress')}
                />
              </Form.Group>
            </Col>

          </Row>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="px-4 fw-semibold"
            disabled={loading || !form.policyholderUserID}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enrolling...
              </>
            ) : (
              <>
                <i className="bi bi-person-check me-2"></i>
                Enroll Member
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}