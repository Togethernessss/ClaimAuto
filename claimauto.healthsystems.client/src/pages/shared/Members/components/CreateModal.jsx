import { useState }                         from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, ListGroup } from 'react-bootstrap';

export default function CreateModal({
  show,
  loading,
  error,
  form,
  policies,           // array of active policies for dropdown
  policyholderUsers,  // array of registered Policyholder users for dropdown
  onHide,
  onFieldChange,
  onSubmit,
}) {
  // Local state for searching within the Policyholder user dropdown
  const [userSearch, setUserSearch] = useState('');

  // Filter users based on search input
  const filteredUsers = (policyholderUsers || []).filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Find selected user for display confirmation
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

            {/* ── Policyholder User Selection (searchable) ── */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Link to Registered User <span className="text-danger">*</span>
                </Form.Label>

                {/* Search box */}
                <Form.Control
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="mb-1"
                />

                {/* Scrollable user list */}
                <div
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: 6,
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {filteredUsers.length === 0 ? (
                    <div className="text-muted small p-3 text-center">
                      {userSearch
                        ? 'No registered users match your search'
                        : 'No registered Policyholder users found'}
                    </div>
                  ) : (
                    <ListGroup variant="flush">
                      {filteredUsers.map((u) => {
                        const isSelected = String(form.policyholderUserID) === String(u.userID);
                        return (
                          <ListGroup.Item
                            key={u.userID}
                            action
                            active={isSelected}
                            onClick={() =>
                              onFieldChange('policyholderUserID')({
                                target: { value: String(u.userID) },
                              })
                            }
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

                {/* Hidden native select for form validation */}
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

                {/* Confirmation chip when a user is selected */}
                {selectedUser && (
                  <div
                    className="mt-2 d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                    style={{
                      background: '#e8f5e9',
                      border: '1px solid #a5d6a7',
                      fontSize: '0.78rem',
                      color: '#2e7d32',
                    }}
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    Selected: <strong>{selectedUser.name}</strong>
                  </div>
                )}

                <Form.Text className="text-muted">
                  The member record will be linked to this user's account.
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
                  onChange={onFieldChange('contactPhone')}
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