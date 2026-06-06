// src/pages/shared/Adjudication/components/ManualAdjudicateModal.jsx
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { formatCurrency, MANUAL_DECISIONS, decisionVariant } from '../utils/adjudicationHelpers';

export default function ManualAdjudicateModal({
  show,
  loading,
  error,
  claim,
  onHide,
  onSubmit,
}) {
    const [decision,      setDecision]      = useState('');
  const [notes,         setNotes]         = useState('');
  const [payableAmount, setPayableAmount] = useState('');

  // Reset on open
  useEffect(() => {
    if (show) {
      setDecision('');
      setNotes('');
      setPayableAmount('');
    }
  }, [show]);

  // Auto-fill payable when decision changes
  useEffect(() => {
    if (!claim || !decision) return;
    setPayableAmount(decision === 'Denied' ? '' : String(claim.totalBilledAmount));
  }, [decision, claim]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payable = decision !== 'Denied' ? parseFloat(payableAmount) || 0 : 0;
    onSubmit({
      claimID:       claim.claimID,
      decision,
      payableAmount: decision !== 'Denied' ? payable : null,
      notes:         notes.trim(),
      calculationsJSON: JSON.stringify({
        billed:            claim.totalBilledAmount,
        allowed:           claim.totalBilledAmount,
        deductibleApplied: Math.max(0, claim.totalBilledAmount - payable),
        copay:             0,
        payable,
        note:              'Manual adjudication',
      }),
    });
  };

  const isValid = decision && notes.trim().length >= 10 &&
    (decision === 'Denied' || (payableAmount !== '' && !isNaN(parseFloat(payableAmount))));

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-pencil-square text-warning me-2"></i>
          Manual Adjudication — CLM-{claim?.claimID}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>

          {claim && (
            <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-muted">Member: </span>
                  <strong>{claim.memberName}</strong>
                </div>
                <div className="col-6">
                  <span className="text-muted">Provider: </span>
                  <strong>{claim.providerName}</strong>
                </div>
                <div className="col-6">
                  <span className="text-muted">Policy: </span>
                  <strong>{claim.policyName}</strong>
                </div>
                <div className="col-6">
                  <span className="text-muted">Billed: </span>
                  <strong style={{ color: '#764ba2' }}>{formatCurrency(claim.totalBilledAmount)}</strong>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">

            {/* Decision */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Decision <span className="text-danger">*</span>
                </Form.Label>
                <div className="d-flex gap-2 flex-wrap">
                  {MANUAL_DECISIONS.map((d) => {
                    const s = decisionVariant(d.value);
                    const isSelected = decision === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDecision(d.value)}
                        style={{
                          flex: 1, minWidth: 120,
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: isSelected
                            ? `2px solid ${s.color}`
                            : '2px solid #dee2e6',
                          background: isSelected ? s.bg : 'white',
                          color: isSelected ? s.color : '#6c757d',
                          fontWeight: isSelected ? 700 : 400,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                        }}
                      >
                        <div className="fw-bold">{d.value}</div>
                        <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
                          {d.value === 'Approved' && 'Approve full payment'}
                          {d.value === 'Denied'   && 'Reject — no payment'}
                          {d.value === 'Partial'  && 'Approve partial amount'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Form.Group>
            </Col>

            {/* Notes — required */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Decision Notes <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Document your reason for this decision (minimum 10 characters)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  Required for audit trail. Be specific — this is recorded permanently.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Payable Amount — shown for Paid / Partial so staff can apply deductible */}
            {decision && decision !== 'Denied' && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Payable Amount <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    step="0.01"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(e.target.value)}
                    placeholder="Amount after deductible"
                  />
                  <Form.Text className="text-muted">
                    Adjust for deductible or partial coverage.
                  </Form.Text>
                </Form.Group>
              </Col>
            )}

                        {/* Calculations breakdown — computed from billed vs payable */}
            {decision && claim && (
              <Col md={12}>
                <div className="rounded-3 p-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 13 }}>
                  <div className="small fw-semibold text-muted mb-2">
                    <i className="bi bi-calculator me-1"></i>Calculation Breakdown
                  </div>
                  {[
                    { label: 'Total Billed',       value: formatCurrency(claim.totalBilledAmount) },
                    { label: 'Deductible Applied', value: formatCurrency(
                        decision === 'Denied' ? 0
                        : Math.max(0, claim.totalBilledAmount - (parseFloat(payableAmount) || 0))
                      )
                    },
                    { label: 'Payable Amount',     value: formatCurrency(
                        decision === 'Denied' ? 0 : (parseFloat(payableAmount) || 0)
                      ), highlight: true
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="d-flex justify-content-between py-1"
                      style={{
                        borderTop: '1px solid #e9ecef',
                        fontWeight: row.highlight ? 700 : 400,
                        color:     row.highlight ? '#764ba2' : undefined,
                      }}
                    >
                      <span className={row.highlight ? '' : 'text-muted'}>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button
            type="submit"
            variant="warning"
            className="px-4 fw-semibold"
            disabled={loading || !isValid}
          >
            {loading
              ? <><Spinner animation="border" size="sm" className="me-2" />Recording Decision...</>
              : <><i className="bi bi-check2-circle me-2"></i>Record Decision</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
