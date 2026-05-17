// src/pages/shared/Claims/components/ReimbursementModal.jsx
// Policyholder submits a reimbursement claim (out-of-pocket expenses).
// Production design: selecting a member enrollment auto-determines the policy.
// policies prop removed — policyName + policyID come from the member enrollment record.
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { CLAIM_PRIORITIES } from '../utils/claimHelpers';

export default function ReimbursementModal({
  show,
  loading,
  error,
  members,  // policyholder's own enrollments — each row has memberID, policyID, policyName
  userID,   // logged-in Policyholder's UserID
  onHide,
  onSubmit, // (formData) => void
  // NOTE: 'policies' prop intentionally removed —
  //       policyID is derived directly from the selected member enrollment.
}) {
  const [form, setForm] = useState({
    memberID:        '',
    policyID:        '',   // auto-set from selected enrollment
    totalPaidAmount: '',
    dateOfTreatment: '',
    hospitalName:    '',
    treatmentDesc:   '',
    priority:        'Normal',
  });

  // Reset on open
  useEffect(() => {
    if (show) {
      setForm({
        memberID:        '',
        policyID:        '',
        totalPaidAmount: '',
        dateOfTreatment: '',
        hospitalName:    '',
        treatmentDesc:   '',
        priority:        'Normal',
      });
    }
  }, [show]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build descriptive notes from form fields
    const notes = [
      form.hospitalName    && `Hospital: ${form.hospitalName}`,
      form.dateOfTreatment && `Date of Treatment: ${form.dateOfTreatment}`,
      form.treatmentDesc   && `Description: ${form.treatmentDesc}`,
    ].filter(Boolean).join(' | ');

    onSubmit({
      externalClaimRef:  null,
      providerID:        userID,
      memberID:          Number(form.memberID),
      policyID:          Number(form.policyID),
      claimType:         'Reimbursement',
      totalBilledAmount: Number(form.totalPaidAmount),
      currency:          'INR',
      priority:          form.priority,
      sourceChannel:     'Portal',
      notes:             notes || null,
    });
  };

  const isValid =
    form.memberID &&
    form.policyID &&
    form.totalPaidAmount &&
    Number(form.totalPaidAmount) > 0 &&
    form.treatmentDesc.trim();

  // Derive selected enrollment for read-only policy display
  const selectedEnrollment = form.memberID
    ? members.find((m) => m.memberID === Number(form.memberID))
    : null;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-arrow-return-left text-primary me-2"></i>
          Request Reimbursement
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <div style={{ overflowY: 'auto', maxHeight: '65vh', padding: '16px 16px 0' }}>

          {/* Info banner */}
          <Alert variant="info" className="py-2 small mb-3">
            <i className="bi bi-info-circle-fill me-2"></i>
            Submit this form for treatments you paid out-of-pocket.
            Attach your bills and receipts after submitting to speed up processing.
          </Alert>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">

            {/* ── Member Enrollment ──────────────────────────────────────
                PRODUCTION DESIGN:
                Each option = "Name (MemberNumber) · PolicyName"
                If same person enrolled under 2 policies → 2 options.
                Selecting enrollment auto-fills the policy field below.  */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Who Received Treatment? <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.memberID}
                  onChange={handleMemberChange}
                  required
                >
                  <option value="">— Select member enrollment —</option>
                  {members.map((m) => (
                    <option key={m.memberID} value={m.memberID}>
                      {m.name} ({m.memberNumber}) · {m.policyName}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Each enrollment covers one policy.
                  If enrolled under multiple policies, select the correct one for this treatment.
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
                    background: selectedEnrollment ? '#f0f4ff' : '#f8f9fa',
                    cursor:     'not-allowed',
                    color:      selectedEnrollment ? '#1a56db' : '#6c757d',
                    fontWeight: selectedEnrollment ? 600 : 400,
                  }}
                />
                <Form.Text className="text-muted">
                  Auto-filled from your enrollment. Cannot be changed.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Amount paid */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Amount Paid (₹) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={form.totalPaidAmount}
                  onChange={handleField('totalPaidAmount')}
                  required
                />
                <Form.Text className="text-muted">
                  Total amount you paid out-of-pocket.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Date of treatment */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Date of Treatment
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.dateOfTreatment}
                  onChange={handleField('dateOfTreatment')}
                  max={new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Col>

            {/* Hospital / Clinic name */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Hospital / Clinic Name
                </Form.Label>
                <Form.Control
                  placeholder="e.g. Apollo Hospital, Delhi"
                  value={form.hospitalName}
                  onChange={handleField('hospitalName')}
                />
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
                <Form.Text className="text-muted">
                  Select Urgent only for emergency treatments.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Treatment description */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Treatment Description <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Describe the treatment received, e.g. Knee surgery for ligament tear, post-accident treatment..."
                  value={form.treatmentDesc}
                  onChange={handleField('treatmentDesc')}
                  required
                />
                <Form.Text className="text-muted">
                  Be specific — this helps our team process your claim faster.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Documents reminder */}
            <Col md={12}>
              <div
                className="rounded-3 p-3"
                style={{ background: '#fff8e1', border: '1px solid #ffe082' }}
              >
                <div className="small fw-semibold mb-2">
                  <i className="bi bi-paperclip me-2 text-warning"></i>
                  After submitting, attach these documents:
                </div>
                <div className="d-flex flex-wrap gap-3 small text-muted">
                  <span><i className="bi bi-check2 text-success me-1"></i>Hospital bills / invoices</span>
                  <span><i className="bi bi-check2 text-success me-1"></i>Prescription copies</span>
                  <span><i className="bi bi-check2 text-success me-1"></i>Lab reports (if any)</span>
                  <span><i className="bi bi-check2 text-success me-1"></i>Discharge summary</span>
                </div>
              </div>
            </Col>

          </Row>
          <div style={{ height: 16 }} />
        </div>

        {/* Footer */}
        <div
          className="d-flex justify-content-end gap-2 px-3 py-3"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="px-4 fw-semibold"
            disabled={loading || !isValid}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" />Submitting...</>
            ) : (
              <><i className="bi bi-send me-2"></i>Submit Reimbursement</>
            )}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
