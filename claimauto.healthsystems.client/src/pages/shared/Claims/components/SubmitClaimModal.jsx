// src/pages/shared/Claims/components/SubmitClaimModal.jsx
// Hospital submits a new claim with claim lines.
// Production design: selecting a member enrollment auto-determines the policy.
// One member can have multiple enrollments (one per policy) — each is a separate MemberID.
import { useState, useEffect, useRef } from 'react';
import {
  Modal, Form, Button, Alert, Spinner, Row, Col, Table, Badge,
} from 'react-bootstrap';
import {
  HOSPITAL_CLAIM_TYPES, CLAIM_PRIORITIES, formatCurrency,
  DOC_TYPES, computeSHA256, simulateFileURI,
} from '../utils/claimHelpers';
import { lookupMemberByNumber } from '../../../../services/members/memberService';
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

  const [lookupQuery,   setLookupQuery]   = useState('');
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState(null);

  const [editLineIdx, setEditLineIdx] = useState(null); // null = adding new, number = editing existing

  // ── Document attachments ──────────────────────────────────────────────────
  const [docs,          setDocs]          = useState([]);   // { docType, file, fileName }
  const [docType,       setDocType]       = useState('Invoice');
  const [docFileName,   setDocFileName]   = useState('');
  const [docError,      setDocError]      = useState(null);
  const [showDocForm,   setShowDocForm]   = useState(false);
  const docFileRef = useRef(null);

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
      setLookupQuery('');
      setLookupResult(null);
      setLookupLoading(false);
      setLookupError(null);
      setEditLineIdx(null);
      setDocs([]);
      setDocType('Invoice');
      setDocFileName('');
      setDocError(null);
      setShowDocForm(false);
      if (docFileRef.current) docFileRef.current.value = '';
    }
  }, [show]);

  const totalBilled = lines.reduce((s, l) => s + l.lineBilledAmount, 0);

  const handleField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  // ── Member lookup — Hospital types member number and clicks Find ──────────
  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    setForm((prev) => ({ ...prev, memberID: '', policyID: '' }));
    try {
      const member = await lookupMemberByNumber(lookupQuery.trim());
      if (member.status !== 'Active') {
        setLookupError(`Member found but status is "${member.status}" — cannot submit claims for inactive members.`);
      } else {
        setLookupResult(member);
        setForm((prev) => ({
          ...prev,
          memberID: String(member.memberID),
          policyID: String(member.policyID),
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Member not found.';
      setLookupError(typeof msg === 'string' ? msg : 'Member not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLineField = (field) => (e) =>
    setLineForm({ ...lineForm, [field]: e.target.value });

  // Uppercase + strip whitespace for medical codes
  const handleCodeField = (field) => (e) =>
    setLineForm({ ...lineForm, [field]: e.target.value.toUpperCase().replace(/\s/g, '') });

  const handleLineQtyOrPrice = (field) => (e) => {
    const updated = { ...lineForm, [field]: e.target.value };
    const qty   = Number(updated.quantity)  || 0;
    const price = Number(updated.unitPrice) || 0;
    updated.lineBilledAmount = qty * price;
    setLineForm(updated);
  };

  // Handles both adding a new line and saving edits to an existing line
  const saveLine = () => {
    setLineError(null);

    const serviceCodeClean  = lineForm.serviceCode.trim().toUpperCase();
    const diagCodeClean     = lineForm.diagnosisCode.trim().toUpperCase();
    const procCodeClean     = lineForm.procedureCode.trim().toUpperCase();

    if (!serviceCodeClean) {
      setLineError('Service code is required.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9\-\.]{0,19}$/.test(serviceCodeClean)) {
      setLineError('Service code must be alphanumeric — e.g. 99223, A0427, HCPC-001.');
      return;
    }
    if (!lineForm.serviceDate) {
      setLineError('Service date is required.');
      return;
    }
    if (new Date(lineForm.serviceDate) > new Date()) {
      setLineError('Service date cannot be in the future — claims must be for services already rendered.');
      return;
    }
    if (Number(lineForm.quantity) < 1 || !Number.isInteger(Number(lineForm.quantity))) {
      setLineError('Quantity must be a whole number of at least 1.');
      return;
    }
    if (!lineForm.unitPrice || Number(lineForm.unitPrice) <= 0) {
      setLineError('Unit price must be greater than 0.');
      return;
    }
    if (diagCodeClean && !/^[A-Z]\d{2}[\w\.]{0,5}$/.test(diagCodeClean)) {
      setLineError('Diagnosis code must be a valid ICD-10 code — e.g. J18.9, M79.3, I10.');
      return;
    }
    if (procCodeClean && !/^[A-Z0-9][A-Z0-9\-\.]{0,19}$/.test(procCodeClean)) {
      setLineError('Procedure code must be alphanumeric — e.g. 27447, G0104.');
      return;
    }

    const qty   = Number(lineForm.quantity)  || 1;
    const price = Number(lineForm.unitPrice) || 0;
    const lineData = {
      serviceCode:        serviceCodeClean,
      serviceDate:        lineForm.serviceDate,
      quantity:           qty,
      unitPrice:          price,
      lineBilledAmount:   qty * price,
      diagnosisCodesJSON: diagCodeClean ? JSON.stringify([diagCodeClean]) : null,
      procedureCodesJSON: procCodeClean ? JSON.stringify([procCodeClean]) : null,
    };

    if (editLineIdx !== null) {
      // Editing an existing line
      const updated = [...lines];
      updated[editLineIdx] = lineData;
      setLines(updated);
      setEditLineIdx(null);
    } else {
      // Adding a new line
      setLines([...lines, lineData]);
    }
    setLineForm(EMPTY_LINE);
    setShowLineForm(false);
  };

  const startEditLine = (idx) => {
    const line = lines[idx];
    let diagCode = '';
    let procCode = '';
    try { diagCode = line.diagnosisCodesJSON ? JSON.parse(line.diagnosisCodesJSON)[0] || '' : ''; } catch {}
    try { procCode = line.procedureCodesJSON ? JSON.parse(line.procedureCodesJSON)[0] || '' : ''; } catch {}
    setLineForm({
      serviceCode:   line.serviceCode,
      serviceDate:   line.serviceDate,
      quantity:      String(line.quantity),
      unitPrice:     String(line.unitPrice),
      diagnosisCode: diagCode,
      procedureCode: procCode,
    });
    setEditLineIdx(idx);
    setShowLineForm(true);
    setLineError(null);
  };

  const removeLine = (idx) =>
    setLines(lines.filter((_, i) => i !== idx));

  const addDoc = () => {
    const file = docFileRef.current?.files?.[0];
    if (!file) { setDocError('Please select a file.'); return; }
    setDocs([...docs, { docType, file, fileName: file.name }]);
    setDocType('Invoice');
    setDocFileName('');
    setDocError(null);
    setShowDocForm(false);
    if (docFileRef.current) docFileRef.current.value = '';
  };

  const removeDoc = (idx) => setDocs(docs.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberID) {
      setLookupError('Please find a patient first by entering their member number above.');
      return;
    }
    // Compute SHA-256 and build fileURIs for each queued document.
    // This runs before the API call so documents are embedded in the claim
    // creation payload and saved before adjudication runs.
    const processedDocs = await Promise.all(
      docs.map(async (d) => ({
        docType:  d.docType,
        fileURI:  simulateFileURI(0, d.docType, d.fileName),  // claimID=0 placeholder; backend stores as-is
        sha256:   await computeSHA256(d.file),
      }))
    );
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
      processedDocs,
    );
  };

 // lookupResult is the found member — drives the policy auto-fill display
  const selectedEnrollment = lookupResult;

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

            {/* ── Patient Lookup by Member Number ─────────────────────────
              Hospital types the member number from the patient's card
              (e.g. MEM-000042) and clicks Find. Name, policy, memberID
              and policyID all auto-fill — no dropdown needed.         */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Patient Member Number <span className="text-danger">*</span>
                </Form.Label>
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    placeholder="e.g. MEM-000042"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleLookup(); }
                    }}
                    style={{ maxWidth: 220 }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={handleLookup}
                    disabled={lookupLoading || !lookupQuery.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {lookupLoading
                      ? <><Spinner size="sm" animation="border" className="me-1" />Finding…</>
                      : <><i className="bi bi-search me-1"></i>Find Patient</>
                    }
                  </Button>
                </div>
                {lookupError && (
                  <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-circle me-1"></i>{lookupError}
                  </div>
                )}
                {lookupResult && (
                  <div className="mt-2 p-2 rounded border border-success-subtle bg-success-subtle d-flex align-items-center gap-2">
                    <i className="bi bi-person-check-fill text-success fs-5"></i>
                    <div>
                      <span className="fw-semibold">{lookupResult.name}</span>
                      <span className="text-muted small ms-2">({lookupResult.memberNumber})</span>
                      <span className="text-muted small ms-2">· {lookupResult.policyName}</span>
                    </div>
                  </div>
                )}
                <Form.Text className="text-muted">
                  Enter the member number from the patient's insurance card, then click Find.
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
                        onChange={handleCodeField('serviceCode')}
                        title="CPT or HCPCS code — alphanumeric, no spaces"
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Service Date *</Form.Label>
                      <Form.Control
                        size="sm"
                        type="date"
                        value={lineForm.serviceDate}
                        max={new Date().toISOString().split('T')[0]}
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
                      <Form.Label className="small fw-semibold">
                        Diagnosis Code <span className="text-muted fw-normal">(ICD-10)</span>
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="e.g. J18.9"
                        value={lineForm.diagnosisCode}
                        onChange={handleCodeField('diagnosisCode')}
                        title="ICD-10 code — letter + 2 digits + optional decimal, e.g. J18.9"
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">
                        Procedure Code <span className="text-muted fw-normal">(CPT)</span>
                      </Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="e.g. 27447"
                        value={lineForm.procedureCode}
                        onChange={handleCodeField('procedureCode')}
                        title="CPT procedure code — alphanumeric, no spaces"
                      />
                    </Col>
                    <Col md={12} className="d-flex justify-content-end gap-2 mt-1">
                      <Button
                        variant="light"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setShowLineForm(false);
                          setLineError(null);
                          setEditLineIdx(null);
                          setLineForm(EMPTY_LINE);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="button" onClick={saveLine}>
                        {editLineIdx !== null
                          ? <><i className="bi bi-check2 me-1"></i>Update Line</>
                          : <><i className="bi bi-plus me-1"></i>Add Line</>
                        }
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
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              <Button
                                variant="link"
                                size="sm"
                                className="text-primary p-0"
                                type="button"
                                title="Edit this line"
                                onClick={() => startEditLine(idx)}
                              >
                                <i className="bi bi-pencil" style={{ fontSize: '0.8rem' }}></i>
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger p-0"
                                type="button"
                                title="Remove this line"
                                onClick={() => removeLine(idx)}
                              >
                                <i className="bi bi-trash3" style={{ fontSize: '0.8rem' }}></i>
                              </Button>
                            </div>
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

            {/* ── Supporting Documents ───────────────────────────────── */}
            <Col md={12}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="small fw-semibold">
                  Supporting Documents
                  {docs.length > 0 && (
                    <Badge bg="secondary" className="ms-2">{docs.length}</Badge>
                  )}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-3"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => { setShowDocForm(!showDocForm); setDocError(null); }}
                  type="button"
                >
                  <i className="bi bi-paperclip me-1"></i>Attach File
                </Button>
              </div>

              {/* Add doc form */}
              {showDocForm && (
                <div
                  className="rounded-3 p-3 mb-2"
                  style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                >
                  {docError && (
                    <Alert variant="danger" className="py-2 small mb-2">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {docError}
                    </Alert>
                  )}
                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Label className="small fw-semibold">Document Type</Form.Label>
                      <Form.Select
                        size="sm"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        {DOC_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="small fw-semibold">File</Form.Label>
                      <input
                        ref={docFileRef}
                        type="file"
                        className="form-control form-control-sm"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setDocFileName(e.target.files?.[0]?.name || '')}
                      />
                    </Col>
                    <Col md={2} className="d-flex gap-1">
                      <Button
                        variant="light"
                        size="sm"
                        type="button"
                        onClick={() => { setShowDocForm(false); setDocError(null); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={addDoc}
                        disabled={!docFileName}
                      >
                        Add
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Queued docs list */}
              {docs.length > 0 && (
                <div className="d-flex flex-column gap-1">
                  {docs.map((d, idx) => (
                    <div
                      key={idx}
                      className="d-flex align-items-center justify-content-between rounded px-3 py-2"
                      style={{ background: '#f0f4ff', border: '1px solid #c7d7f9', fontSize: '0.82rem' }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-file-earmark-text text-primary"></i>
                        <span className="fw-semibold">{d.fileName}</span>
                        <Badge bg="light" text="dark" className="border" style={{ fontSize: '0.68rem' }}>
                          {d.docType}
                        </Badge>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        type="button"
                        onClick={() => removeDoc(idx)}
                      >
                        <i className="bi bi-x-lg" style={{ fontSize: '0.75rem' }}></i>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {docs.length === 0 && !showDocForm && (
                <div
                  className="text-center py-2 rounded-3 text-muted small"
                  style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
                >
                  <i className="bi bi-paperclip me-1"></i>
                  Optional — attach invoices, lab reports, or prescriptions.
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
