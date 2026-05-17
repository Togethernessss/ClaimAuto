// src/pages/shared/Claims/components/SubmitClaimModal.jsx
// Hospital submits a new claim with claim lines.
// Production design: selecting a member enrollment auto-determines the policy.
// One member can have multiple enrollments (one per policy) — each is a separate MemberID.
import { useState, useEffect } from 'react';
import {
  Modal, Form, Button, Alert, Spinner, Row, Col, Table, Badge,
} from 'react-bootstrap';
import { HOSPITAL_CLAIM_TYPES, CLAIM_PRIORITIES, formatCurrency } from '../utils/claimHelpers';

const EMPTY_LINE = {
  serviceCode:   '',
  serviceDate:   '',
  quantity:      1,
  unitPrice:     '',
  diagnosisCode: '',
  procedureCode: '',
};

export default function SubmitClaimModal({
  show,
  loading,
  error,
  members,  // all active members — each row = one enrollment (memberID + policyID + policyName)
  userID,   // logged-in Hospital's UserID
  onHide,
  onSubmit, // (formData, lines) => void
}) {
  const [form, setForm] = useState({
    externalClaimRef: '',
    memberID:         '',
    policyID:         '',   // auto-set from selected member's enrollment
    claimType:        '',
    priority:         'Normal',
    notes:            '',
  });

  const [lines,        setLines]        = useState([]);
  const [lineForm,     setLineForm]     = useState(EMPTY_LINE);
  const [lineError,    setLineError]    = useState(null);
  const [showLineForm, setShowLineForm] = useState(false);

  // Reset on open
  useEffect(() => {
    if (show) {
      setForm({
        externalClaimRef: '',
        memberID:         '',
        policyID:         '',
        claimType:        '',
        priority:         'Normal',
        notes:            '',
      });
      setLines([]);
      setLineForm(EMPTY_LINE);
      setLineError(null);
      setShowLineForm(false);
    }
  }, [show]);

  const totalBilled = lines.reduce((s, l) => s + l.lineBilledAmount, 0);

  const handleField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  // ── When member/enrollment is selected, auto-fill the policy ──────────────
  // Each member record = one enrollment under one specific policy.
  // policyID is derived from the enrollment — no separate selection needed.
  const handleMemberChange = (e) => {
    const selectedMemberID = Number(e.target.value);
    const enrollment = members.find((m) => m.memberID === selectedMemberID);
    setForm({
      ...form,
      memberID: e.target.value,
      policyID: enrollment ? String(enrollment.policyID) : '',
    });
  };

  const handleLineField = (field) => (e) =>
    setLineForm({ ...lineForm, [field]: e.target.value });

  const handleLineQtyOrPrice = (field) => (e) => {
    const updated = { ...lineForm, [field]: e.target.value };
    const qty   = Number(updated.quantity)  || 0;
    const price = Number(updated.unitPrice) || 0;
    updated.lineBilledAmount = qty * price;
    setLineForm(updated);
  };

  const addLine = () => {
    setLineError(null);
    if (!lineForm.serviceCode.trim()) {
      setLineError('Service code is required.');
      return;
    }
    if (!lineForm.serviceDate) {
      setLineError('Service date is required.');
      return;
    }
    if (!lineForm.unitPrice || Number(lineForm.unitPrice) <= 0) {
      setLineError('Unit price must be greater than 0.');
      return;
    }
    const qty   = Number(lineForm.quantity)  || 1;
    const price = Number(lineForm.unitPrice) || 0;
    setLines([...lines, {
      serviceCode:        lineForm.serviceCode.trim(),
      serviceDate:        lineForm.serviceDate,
      quantity:           qty,
      unitPrice:          price,
      lineBilledAmount:   qty * price,
      diagnosisCodesJSON: lineForm.diagnosisCode
                            ? JSON.stringify([lineForm.diagnosisCode.trim()])
                            : null,
      procedureCodesJSON: lineForm.procedureCode
                            ? JSON.stringify([lineForm.procedureCode.trim()])
                            : null,
    }]);
    setLineForm(EMPTY_LINE);
    setShowLineForm(false);
  };

  const removeLine = (idx) =>
    setLines(lines.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(
      {
        externalClaimRef:  form.externalClaimRef || null,
        providerID:        userID,
        memberID:          Number(form.memberID),
        policyID:          Number(form.policyID),
        claimType:         form.claimType,
        totalBilledAmount: totalBilled,
        currency:          'INR',
        priority:          form.priority,
        sourceChannel:     'Portal',
        notes:             form.notes || null,
      },
      lines,
    );
  };

  // Derive selected enrollment for read-only policy display
  const selectedEnrollment = form.memberID
    ? members.find((m) => m.memberID === Number(form.memberID))
    : null;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-file-plus text-primary me-2"></i>
          Submit New Claim
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <div style={{ overflowY: 'auto', maxHeight: '65vh', padding: '16px 16px 0' }}>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">

            {/* External Claim Ref */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  External Claim Ref
                </Form.Label>
                <Form.Control
                  placeholder="e.g. HOSP-2026-00142"
                  value={form.externalClaimRef}
                  onChange={handleField('externalClaimRef')}
                />
                <Form.Text className="text-muted">
                  Your billing system reference. Must be unique.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Claim Type */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Claim Type <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.claimType}
                  onChange={handleField('claimType')}
                  required
                >
                  <option value="">— Select type —</option>
                  {HOSPITAL_CLAIM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* ── Patient Enrollment ──────────────────────────────────────
                PRODUCTION DESIGN:
                Each option shows: "Name (MemberNumber) · PolicyName"
                One person enrolled under 2 policies = 2 options.
                Selecting an enrollment automatically determines the policy.
                This prevents wrong-policy errors entirely.              */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Patient Enrollment <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.memberID}
                  onChange={handleMemberChange}
                  required
                >
                  <option value="">— Select patient enrollment —</option>
                  {members.map((m) => (
                    <option key={m.memberID} value={m.memberID}>
                      {m.name} ({m.memberNumber}) · {m.policyName}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Each enrollment is linked to one specific policy.
                  If a patient has multiple enrollments, select the correct one for this treatment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* ── Policy — read-only, auto-filled from enrollment ─────── */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Policy
                  <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.65rem' }}>
                    Auto-filled
                  </Badge>
                </Form.Label>
                <Form.Control
                  readOnly
                  value={
                    selectedEnrollment
                      ? selectedEnrollment.policyName
                      : '— Select an enrollment first —'
                  }
                  style={{
                    background:  selectedEnrollment ? '#f0f4ff' : '#f8f9fa',
                    cursor:      'not-allowed',
                    color:       selectedEnrollment ? '#1a56db' : '#6c757d',
                    fontWeight:  selectedEnrollment ? 600 : 400,
                  }}
                />
                <Form.Text className="text-muted">
                  Determined by the selected enrollment. Cannot be changed independently.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Priority */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Priority</Form.Label>
                <Form.Select value={form.priority} onChange={handleField('priority')}>
                  {CLAIM_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Notes */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Clinical Notes</Form.Label>
                <Form.Control
                  placeholder="Optional clinical notes, diagnosis summary, or remarks..."
                  value={form.notes}
                  onChange={handleField('notes')}
                />
              </Form.Group>
            </Col>

            {/* ── Claim Lines ────────────────────────────────────────── */}
            <Col md={12}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="small fw-semibold">
                  Service Lines
                  {lines.length > 0 && (
                    <Badge bg="primary" className="ms-2">{lines.length}</Badge>
                  )}
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="rounded-pill px-3"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setShowLineForm(!showLineForm)}
                  type="button"
                >
                  <i className="bi bi-plus me-1"></i>Add Line
                </Button>
              </div>

              {/* Add line form */}
              {showLineForm && (
                <div
                  className="rounded-3 p-3 mb-3"
                  style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                >
                  {lineError && (
                    <Alert variant="danger" className="py-2 small mb-2">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {lineError}
                    </Alert>
                  )}
                  <Row className="g-2">
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Service Code *</Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="e.g. 99223"
                        value={lineForm.serviceCode}
                        onChange={handleLineField('serviceCode')}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Service Date *</Form.Label>
                      <Form.Control
                        size="sm"
                        type="date"
                        value={lineForm.serviceDate}
                        onChange={handleLineField('serviceDate')}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="small fw-semibold">Qty</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min="1"
                        value={lineForm.quantity}
                        onChange={handleLineQtyOrPrice('quantity')}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="small fw-semibold">Unit Price (₹)</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={lineForm.unitPrice}
                        onChange={handleLineQtyOrPrice('unitPrice')}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="small fw-semibold">Total</Form.Label>
                      <Form.Control
                        size="sm"
                        readOnly
                        value={formatCurrency(
                          (Number(lineForm.quantity) || 0) * (Number(lineForm.unitPrice) || 0)
                        )}
                        style={{ background: '#f0f4ff' }}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Diagnosis Code</Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="e.g. J18.9"
                        value={lineForm.diagnosisCode}
                        onChange={handleLineField('diagnosisCode')}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Procedure Code</Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="e.g. 27447"
                        value={lineForm.procedureCode}
                        onChange={handleLineField('procedureCode')}
                      />
                    </Col>
                    <Col md={12} className="d-flex justify-content-end gap-2 mt-1">
                      <Button
                        variant="light"
                        size="sm"
                        type="button"
                        onClick={() => { setShowLineForm(false); setLineError(null); }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="button" onClick={addLine}>
                        <i className="bi bi-plus me-1"></i> Add Line
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Lines table */}
              {lines.length > 0 && (
                <div className="rounded-3" style={{ border: '1px solid #e9ecef', overflow: 'hidden' }}>
                  <Table size="sm" className="mb-0 align-middle">
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr>
                        <th className="ps-3 py-2 small text-muted fw-semibold">Code</th>
                        <th className="py-2 small text-muted fw-semibold">Date</th>
                        <th className="py-2 small text-muted fw-semibold">Qty</th>
                        <th className="py-2 small text-muted fw-semibold">Unit ₹</th>
                        <th className="py-2 small text-muted fw-semibold">Total ₹</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 py-2 small fw-semibold font-monospace">
                            {line.serviceCode}
                          </td>
                          <td className="py-2 small">
                            {new Date(line.serviceDate).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="py-2 small">{line.quantity}</td>
                          <td className="py-2 small">{formatCurrency(line.unitPrice)}</td>
                          <td className="py-2 small fw-semibold">
                            {formatCurrency(line.lineBilledAmount)}
                          </td>
                          <td className="py-2 pe-3 text-end">
                            <Button
                              variant="link"
                              size="sm"
                              className="text-danger p-0"
                              type="button"
                              onClick={() => removeLine(idx)}
                            >
                              <i className="bi bi-trash3"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f0f4ff' }}>
                      <tr>
                        <td colSpan={4} className="ps-3 py-2 small fw-semibold text-end">
                          Total Billed:
                        </td>
                        <td className="py-2 fw-bold text-primary">
                          {formatCurrency(totalBilled)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              )}

              {lines.length === 0 && !showLineForm && (
                <div
                  className="text-center py-3 rounded-3 text-muted small"
                  style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
                >
                  <i className="bi bi-list-ul me-2"></i>
                  No service lines added yet. Click "Add Line" to add.
                </div>
              )}
            </Col>

          </Row>
          <div style={{ height: 16 }} />
        </div>

        {/* Footer */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-3"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <div className="small text-muted">
            {lines.length > 0 && (
              <>
                <strong>{lines.length}</strong> line{lines.length !== 1 ? 's' : ''} ·{' '}
                <strong className="text-primary">{formatCurrency(totalBilled)}</strong> total
              </>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button variant="light" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-4 fw-semibold"
              disabled={
                loading ||
                lines.length === 0 ||
                !form.memberID ||
                !form.policyID ||
                !form.claimType
              }
            >
              {loading ? (
                <><Spinner animation="border" size="sm" className="me-2" />Submitting...</>
              ) : (
                <><i className="bi bi-send me-2"></i>Submit Claim</>
              )}
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
