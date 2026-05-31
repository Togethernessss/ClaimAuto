import { useState, useEffect } from 'react';
import { Modal, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import api from '../../../../api/axiosClient';

export default function CreatePaymentModal({
  show,
  loading,
  error,
  form,
  payments,
  onHide,
  onFieldChange,
  onSubmit,
}) {
  const [claims, setClaims]                   = useState([]);
  const [claimsLoading, setClaimsLoading]     = useState(false);
  const [claimSearch, setClaimSearch]         = useState('');
  const [showPanel, setShowPanel]             = useState(false);
  const [selectedClaim, setSelectedClaim]     = useState(null);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!show) {
      setClaimSearch('');
      setShowPanel(false);
      setSelectedClaim(null);
      setValidationError(null);
      return;
    }
    async function loadClaims() {
      setClaimsLoading(true);
      try {
        const res = await api.get('/api/claims', { params: { status: 'Approved' } });
        setClaims(res.data);
      } catch {
        setClaims([]);
      } finally {
        setClaimsLoading(false);
      }
    }
    loadClaims();
  }, [show]);

  function getPaymentInfo(claimId) {
    const claimPayments = payments.filter(p => p.claimID === claimId);
    if (claimPayments.length === 0) return null;
    const totalPaid = claimPayments
      .filter(p => p.status === 'Executed')
      .reduce((sum, p) => sum + p.amount, 0);
    return { count: claimPayments.length, totalPaid };
  }

  // 4.3 — hide claims that already have a non-Failed payment so staff can't
  // accidentally double-pay. We treat 'Failed' as the only re-payable state;
  // every other status (Pending/Authorized/Executed) is "active" and blocks.
  const hasActivePayment = (claimId) =>
    payments.some(p => p.claimID === claimId && p.status !== 'Failed');

  const unpaidClaims = claims.filter(c => !hasActivePayment(c.claimID));

  const filteredClaims = claimSearch
    ? unpaidClaims.filter(c =>
        c.providerName?.toLowerCase().includes(claimSearch.toLowerCase()) ||
        String(c.claimID).includes(claimSearch))
    : unpaidClaims.slice(0, 20);

  // FIX: set both claimID and payeeID when a claim is selected
  // c.providerID = the hospital's UserID — this is who gets paid
  // 6.2 — also pre-fill amount with the claim's approved amount so staff
  //       don't have to retype it. They can still adjust if needed.
  function handleSelectClaim(c) {
    setSelectedClaim(c);
    setShowPanel(false);
    setClaimSearch('');
    setValidationError(null);
    onFieldChange('claimID')({ target: { value: c.claimID } });
    onFieldChange('payeeID')({ target: { value: c.providerID } });
    onFieldChange('amount')({
      target: { value: c.approvedAmount ?? c.totalBilledAmount ?? '' }
    });
  }

  // FIX: clear both claimID and payeeID when user clicks "Change"
  function handleClearSelection() {
    setSelectedClaim(null);
    setClaimSearch('');
    setShowPanel(false);
    onFieldChange('claimID')({ target: { value: null } });
    onFieldChange('payeeID')({ target: { value: null } }); // ← KEY FIX
  }

  function handleSubmit() {
    if (!form.claimID) {
      setValidationError('Please select a claim before creating a payment.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setValidationError('Please enter a valid amount greater than 0.');
      return;
    }
    // 4.1 — block at the client too. Backend also enforces (returns 409),
    //       but checking here gives an immediate inline error instead of
    //       an awkward round-trip with a generic toast.
    if (hasActivePayment(form.claimID)) {
      setValidationError(
        'This claim already has an active payment. ' +
        'Cancel or void the existing payment before creating a new one.'
      );
      return;
    }
    setValidationError(null);
    onSubmit();
  }

  const paymentInfo = selectedClaim ? getPaymentInfo(selectedClaim.claimID) : null;
  const isFormValid = form.claimID && form.amount && parseFloat(form.amount) > 0;

  function typeStyle(type) {
    switch (type) {
      case 'Inpatient':     return { bg: '#fce4ec', color: '#880e4f' };
      case 'Outpatient':    return { bg: '#e3f2fd', color: '#1565c0' };
      case 'Pharmacy':      return { bg: '#f3e5f5', color: '#4a148c' };
      case 'Emergency':     return { bg: '#fff3e0', color: '#e65100' };
      // Reimbursement case removed — claim type no longer exists.
      default:              return { bg: '#f5f5f5', color: '#424242' };
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold" style={{ fontSize: 16 }}>
          <i className="bi bi-plus-circle me-2" style={{ color: '#667eea' }}></i>
          New Payment
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">

        {error && (
          <div className="px-4 pt-3">
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          </div>
        )}

        {validationError && (
          <div className="px-4 pt-3">
            <Alert variant="warning" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-circle-fill me-2"></i>
              {validationError}
            </Alert>
          </div>
        )}

        <div style={{ display: 'flex', height: 420 }}>

          {/* ── Left — form ─────────────────────────────────────────── */}
          <div style={{
            width: showPanel ? '52%' : '100%',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'width 0.2s ease',
          }}>

            <Form.Group>
              <Form.Label className="fw-semibold small">
                Search & select claim <span className="text-danger">*</span>
              </Form.Label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-search" style={{
                  position: 'absolute', left: 10, top: '50%',
                  transform: 'translateY(-50%)', fontSize: 13,
                  color: '#6c757d',
                }}></i>
                <Form.Control
                  type="text"
                  placeholder="Search by hospital name or claim ID..."
                  value={claimSearch}
                  style={{ paddingLeft: 32, fontSize: 13, borderRadius: 8 }}
                  onFocus={() => setShowPanel(true)}
                  onChange={(e) => {
                    setClaimSearch(e.target.value);
                    setShowPanel(true);
                  }}
                />
              </div>
              {!selectedClaim && !showPanel && (
                <Form.Text className="text-muted">
                  Click the search bar to browse approved claims →
                </Form.Text>
              )}
            </Form.Group>

            {selectedClaim && !showPanel && (
              <div style={{
                border: '0.5px solid #667eea',
                borderRadius: 8,
                background: '#f3f0ff',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 4, background: '#667eea', flexShrink: 0 }}></div>
                  <div style={{ padding: '8px 12px', flex: 1 }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-semibold" style={{ fontSize: 13 }}>
                          {selectedClaim.providerName}
                        </span>
                        <span className="font-monospace text-muted ms-2" style={{ fontSize: 10 }}>
                          Claim #{selectedClaim.claimID} · ₹{Number(selectedClaim.totalBilledAmount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span
                        style={{ fontSize: 11, color: '#667eea', cursor: 'pointer' }}
                        onClick={handleClearSelection}
                      >
                        Change
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span className="text-muted" style={{ fontSize: 10 }}>
                        {selectedClaim.memberName} · {selectedClaim.claimType}
                      </span>
                      {paymentInfo ? (
                        <span style={{ fontSize: 10, color: '#e65100' }}>
                          ⚠ {paymentInfo.count} existing payment{paymentInfo.count > 1 ? 's' : ''}
                          {paymentInfo.totalPaid > 0 && <> · ₹{paymentInfo.totalPaid.toLocaleString('en-IN')} executed</>}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#2e7d32' }}>
                          ✓ No payments yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Row className="g-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">
                    Amount (₹) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="e.g. 25000"
                    value={form.amount}
                    onChange={(e) => {
                      setValidationError(null);
                      onFieldChange('amount')(e);
                    }}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Payment Method</Form.Label>
                  <Form.Select
                    value={form.paymentMethod}
                    onChange={onFieldChange('paymentMethod')}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="EFT">EFT</option>
                    <option value="ACH">ACH</option>
                    <option value="Check">Check</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Currency</Form.Label>
                  <Form.Select
                    value={form.currency}
                    onChange={onFieldChange('currency')}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Scheduled At</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={onFieldChange('scheduledAt')}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: 10 }}>
                    Leave blank to process immediately.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: 8,
              borderTop: '0.5px solid #dee2e6',
            }}>
              <button className="btn btn-light btn-sm" onClick={onHide} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn btn-sm fw-semibold text-white"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 20px',
                  opacity: isFormValid ? 1 : 0.45,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s',
                }}
              >
                {loading
                  ? <><Spinner animation="border" size="sm" className="me-2" />Creating...</>
                  : <><i className="bi bi-plus-lg me-1"></i>Create Payment</>}
              </button>
            </div>
          </div>

          {/* ── Right — claims panel ──────────────────────────────────── */}
          {showPanel && (
            <div style={{
              width: '48%',
              borderLeft: '0.5px solid #dee2e6',
              display: 'flex',
              flexDirection: 'column',
            }}>

              <div style={{
                padding: '10px 14px',
                background: '#f8f9fa',
                borderBottom: '0.5px solid #dee2e6',
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Approved Claims
                </div>
                <div style={{ fontSize: 10, color: '#6c757d', marginTop: 2 }}>
                  {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''} · scroll to see all
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {claimsLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <div className="text-muted small mt-2">Loading claims...</div>
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                    <div className="text-muted small mt-2">No approved claims found</div>
                  </div>
                ) : (
                  filteredClaims.map((c) => {
                    const info       = getPaymentInfo(c.claimID);
                    const isSelected = form.claimID === c.claimID;
                    const ts         = typeStyle(c.claimType);
                    return (
                      <div
                        key={c.claimID}
                        onClick={() => handleSelectClaim(c)}
                        style={{
                          display: 'flex',
                          borderBottom: '0.5px solid #f0f0f0',
                          background: isSelected ? '#f3f0ff' : 'white',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'white';
                        }}
                      >
                        <div style={{
                          width: 3,
                          background: isSelected ? '#667eea' : 'transparent',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}></div>

                        <div style={{ padding: '9px 12px', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--bs-body-color)' }}>
                                {c.providerName}
                              </span>
                              {isSelected && (
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 11 }}></i>
                              )}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#764ba2' }}>
                              ₹{Number(c.totalBilledAmount).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: '#6c757d', fontFamily: 'monospace' }}>
                                #{c.claimID}
                              </span>
                              <span style={{
                                fontSize: 9, padding: '1px 6px',
                                borderRadius: 4, fontWeight: 500,
                                background: ts.bg, color: ts.color,
                              }}>
                                {c.claimType}
                              </span>
                              <span style={{ fontSize: 10, color: '#6c757d' }}>
                                {c.memberName}
                              </span>
                            </div>
                            {info ? (
                              <span style={{ fontSize: 10, color: '#e65100' }}>
                                ⚠ {info.count} payment{info.count > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: '#2e7d32' }}>
                                ✓ No payments
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </Modal.Body>
    </Modal>
  );
}