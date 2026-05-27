// src/pages/shared/Claims/components/ClaimDetailModal.jsx
// Full claim detail with 4 tabs: Info / Lines / Documents / Adjudication
// All roles can view. Hospital + Policyholder can upload documents.
import { useState, useRef, useEffect } from 'react';
import {
  Modal, Tab, Tabs, Badge, Button, Alert, Spinner, Table,
} from 'react-bootstrap';
import {
  formatDate, formatDateTime, formatCurrency,
  statusVariant, statusLabel,
  priorityVariant, priorityTextColor,
  claimTypeVariant, claimTypeIcon,
  docStatusVariant, lineStatusVariant,
  adjDecisionVariant, DOC_TYPES,
  simulateFileURI, computeSHA256,
} from '../utils/claimHelpers';

export default function ClaimDetailModal({
  show,
  claim,           // ClaimDetailResponseDto | null
  loadingDetail,   // boolean — fetching detail
  uploadingDoc,    // boolean — upload in progress
  uploadError,     // string | null
  uploadSuccess,   // string | null
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  onHide,
  onUploadDocument, // (claimId, dto) => void
}) {
  const [activeTab, setActiveTab] = useState('info');
  const [docType, setDocType] = useState('Invoice');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (show) {
      setActiveTab('info');
      setDocType('Invoice');
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [show]);

  const canUpload = isAdmin || isStaff || isHospital || isPolicyholder;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

    const handleUpload = async () => {
    if (!fileName || !claim) return;
    const file = fileRef.current?.files?.[0];
    const sha256 = file ? await computeSHA256(file) : '';
    const dto = {
      docType,
      fileURI: simulateFileURI(claim.claimID, docType, fileName),
      sha256,
    };
    onUploadDocument(claim.claimID, dto);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };
  
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-file-medical text-primary me-2"></i>
          {claim ? `CLM-${claim.claimID}` : 'Claim Detail'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">

        {/* Loading */}
        {loadingDetail && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted mt-2 small">Loading claim details...</div>
          </div>
        )}

        {/* Content */}
        {!loadingDetail && claim && (
          <>
            {/* Status + priority row */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <Badge bg={statusVariant(claim.status)} className="px-3 py-2">
                {statusLabel(claim.status)}
              </Badge>
              <Badge
                bg={priorityVariant(claim.priority)}
                text={priorityTextColor(claim.priority)}
                className="px-2 py-1"
                style={{ border: claim.priority === 'Normal' ? '1px solid #dee2e6' : 'none' }}
              >
                {claim.priority === 'Urgent' && (
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                )}
                {claim.priority}
              </Badge>
              <Badge bg={claimTypeVariant(claim.claimType)} className="px-2 py-1">
                <i className={`${claimTypeIcon(claim.claimType)} me-1`}></i>
                {claim.claimType}
              </Badge>
              <span className="text-muted small ms-auto">
                Submitted {formatDate(claim.submittedAt)}
              </span>
            </div>

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              {/* ── TAB 1: INFO ─────────────────────────────────────── */}
              <Tab eventKey="info" title={<><i className="bi bi-info-circle me-1"></i>Info</>}>
                <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                  <div
                    className="rounded-3"
                    style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                  >
                    {[
                      { label: 'Member', value: claim.memberName, icon: 'bi-person' },
                      { label: 'Provider', value: claim.providerName, icon: 'bi-hospital' },
                      { label: 'Policy', value: claim.policyName, icon: 'bi-shield-check' },
                      { label: 'Total Billed', value: formatCurrency(claim.totalBilledAmount), icon: 'bi-cash-coin' },
                      { label: 'Currency', value: claim.currency, icon: 'bi-currency-rupee' },
                      { label: 'Source', value: claim.sourceChannel, icon: 'bi-send' },
                      { label: 'Received At', value: formatDateTime(claim.receivedAt), icon: 'bi-clock' },
                      claim.externalClaimRef
                        ? { label: 'External Ref', value: claim.externalClaimRef, icon: 'bi-tag' }
                        : null,
                      claim.notes
                        ? { label: 'Notes', value: claim.notes, icon: 'bi-chat-text' }
                        : null,
                    ].filter(Boolean).map((row, idx, arr) => (
                      <div
                        key={row.label}
                        className="d-flex align-items-start justify-content-between px-3"
                        style={{
                          padding: '10px 12px',
                          borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none',
                        }}
                      >
                        <div
                          className="d-flex align-items-center gap-2 text-muted"
                          style={{ fontSize: '0.8rem', minWidth: 130 }}
                        >
                          <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>
                          {row.label}
                        </div>
                        <div
                          className="fw-semibold text-end"
                          style={{ fontSize: '0.85rem', maxWidth: '60%', wordBreak: 'break-word' }}
                        >
                          {row.value || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Tab>

              {/* ── TAB 2: LINES ─────────────────────────────────────── */}
              <Tab
                eventKey="lines"
                title={
                  <>
                    <i className="bi bi-list-ul me-1"></i>
                    Lines
                    {claim.claimLines?.length > 0 && (
                      <Badge bg="primary" className="ms-1" style={{ fontSize: '0.65rem' }}>
                        {claim.claimLines.length}
                      </Badge>
                    )}
                  </>
                }
              >
                <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                  {!claim.claimLines || claim.claimLines.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      <i className="bi bi-list-ul" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                      <div className="mt-2">No service lines recorded.</div>
                    </div>
                  ) : (
                    <Table size="sm" hover className="mb-0">
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          <th className="ps-3 py-2 small text-muted fw-semibold">Code</th>
                          <th className="py-2 small text-muted fw-semibold">Date</th>
                          <th className="py-2 small text-muted fw-semibold">Qty</th>
                          <th className="py-2 small text-muted fw-semibold">Unit ₹</th>
                          <th className="py-2 small text-muted fw-semibold">Total ₹</th>
                          <th className="py-2 small text-muted fw-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claim.claimLines.map((line) => (
                          <tr key={line.lineID}>
                            <td className="ps-3 py-2 small fw-semibold font-monospace">
                              {line.serviceCode}
                            </td>
                            <td className="py-2 small">{formatDate(line.serviceDate)}</td>
                            <td className="py-2 small">{line.quantity}</td>
                            <td className="py-2 small">{formatCurrency(line.unitPrice)}</td>
                            <td className="py-2 small fw-semibold">
                              {formatCurrency(line.lineBilledAmount)}
                            </td>
                            <td className="py-2">
                              <Badge
                                bg={lineStatusVariant(line.lineStatus)}
                                className="px-2 py-1"
                                style={{ fontSize: '0.7rem' }}
                              >
                                {line.lineStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
              </Tab>

              {/* ── TAB 3: DOCUMENTS ─────────────────────────────────── */}
              <Tab
                eventKey="documents"
                title={
                  <>
                    <i className="bi bi-paperclip me-1"></i>
                    Documents
                    {claim.claimDocuments?.length > 0 && (
                      <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.65rem' }}>
                        {claim.claimDocuments.length}
                      </Badge>
                    )}
                  </>
                }
              >
                <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>

                  {/* Upload section */}
                  {canUpload && (
                    <div
                      className="rounded-3 p-3 mb-3"
                      style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                    >
                      <div className="small fw-semibold mb-2">
                        <i className="bi bi-upload me-2 text-primary"></i>
                        Attach a Document
                      </div>

                      {uploadSuccess && (
                        <Alert variant="success" className="py-2 small mb-2">
                          <i className="bi bi-check-circle-fill me-2"></i>
                          {uploadSuccess}
                        </Alert>
                      )}
                      {uploadError && (
                        <Alert variant="danger" className="py-2 small mb-2">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          {uploadError}
                        </Alert>
                      )}

                      <div className="d-flex gap-2 align-items-end flex-wrap">
                        <div style={{ minWidth: 150 }}>
                          <label className="small text-muted mb-1">Document Type</label>
                          <select
                            className="form-select form-select-sm"
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                          >
                            {DOC_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-grow-1">
                          <label className="small text-muted mb-1">Choose File</label>
                          <input
                            ref={fileRef}
                            type="file"
                            className="form-control form-control-sm"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileChange}
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          className="fw-semibold"
                          disabled={!fileName || uploadingDoc}
                          onClick={handleUpload}
                        >
                          {uploadingDoc ? (
                            <><Spinner animation="border" size="sm" className="me-1" />Uploading...</>
                          ) : (
                            <><i className="bi bi-upload me-1"></i>Upload</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Document list */}
                  {!claim.claimDocuments || claim.claimDocuments.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      <i className="bi bi-file-earmark-x" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                      <div className="mt-2">No documents attached yet.</div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {claim.claimDocuments.map((doc) => (
                        <div
                          key={doc.docID}
                          className="d-flex align-items-center justify-content-between rounded-3 px-3 py-2"
                          style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-file-earmark-pdf text-danger fs-5"></i>
                            <div>
                              <div className="small fw-semibold">{doc.docType}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                Uploaded by {doc.uploadedByName} · {formatDate(doc.uploadedAt)}
                              </div>
                            </div>
                          </div>
                          <Badge
                            bg={docStatusVariant(doc.status)}
                            className="px-2 py-1"
                            style={{ fontSize: '0.7rem' }}
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tab>

              {/* ── TAB 4: ADJUDICATION ──────────────────────────────── */}
              <Tab
                eventKey="adjudication"
                title={<><i className="bi bi-cpu me-1"></i>Adjudication</>}
              >
                <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                  {!claim.adjudication ? (
                    <div className="text-center py-4 text-muted small">
                      <i className="bi bi-cpu" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                      <div className="mt-2 fw-semibold">Not yet adjudicated</div>
                      <div>This claim is waiting for the adjudication engine to process it.</div>
                    </div>
                  ) : (
                    <div>
                      {/* Decision banner */}
                      <div
                        className="rounded-3 p-3 mb-3 text-center"
                        style={{
                          background: claim.adjudication.decision === 'Paid'
                            ? '#d1f2eb' : claim.adjudication.decision === 'Partial'
                              ? '#e3f2fd' : claim.adjudication.decision === 'Denied'
                                ? '#ffebee' : '#fff8e1',
                          border: `1px solid ${claim.adjudication.decision === 'Paid' ? '#a5d6a7'
                              : claim.adjudication.decision === 'Partial' ? '#90caf9'
                                : claim.adjudication.decision === 'Denied' ? '#ef9a9a'
                                  : '#ffe082'}`,
                        }}
                      >
                        <Badge
                          bg={adjDecisionVariant(claim.adjudication.decision)}
                          className="px-3 py-2 fs-6"
                        >
                          {claim.adjudication.decision}
                        </Badge>
                        <div className="small text-muted mt-2">
                          Decided on {formatDateTime(claim.adjudication.executedAt)}
                          {' '}by <strong>{claim.adjudication.performedByName}</strong>
                        </div>
                      </div>

                      {/* Adjudication details */}
                      <div
                        className="rounded-3"
                        style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                      >
                        {[
                          { label: 'Engine Version', value: claim.adjudication.engineVersion, icon: 'bi-cpu' },
                          { label: 'Performed By', value: claim.adjudication.performedByName, icon: 'bi-person' },
                          { label: 'Notes', value: claim.adjudication.notes, icon: 'bi-chat-text' },
                        ].filter((r) => r.value).map((row, idx, arr) => (
                          <div
                            key={row.label}
                            className="d-flex align-items-start justify-content-between px-3"
                            style={{
                              padding: '10px 12px',
                              borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none',
                            }}
                          >
                            <div
                              className="d-flex align-items-center gap-2 text-muted"
                              style={{ fontSize: '0.8rem', minWidth: 130 }}
                            >
                              <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>
                              {row.label}
                            </div>
                            <div className="fw-semibold text-end" style={{ fontSize: '0.85rem' }}>
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Applied rules — human-readable, NOT raw JSON */}
                      {claim.adjudication.appliedRulesJSON && (() => {
                        // Manual adjudication has no automated rules — show a clear notice instead
                        if (claim.adjudication.engineVersion === 'manual') {
                          return (
                            <div className="mt-3">
                              <div className="small fw-semibold mb-2 text-muted">
                                <i className="bi bi-gear me-1"></i>Applied Rules
                              </div>
                              <div
                                className="d-flex align-items-center gap-2 px-3 py-2 rounded"
                                style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: '0.8rem' }}
                              >
                                <i className="bi bi-person-check text-secondary"></i>
                                <span className="text-muted">
                                  Manually adjudicated by staff — no automated rules were applied.
                                </span>
                              </div>
                            </div>
                          );
                        }
                        let rules = [];
                        try { rules = JSON.parse(claim.adjudication.appliedRulesJSON); } catch { rules = []; }
                        // Filter out empty placeholder entries (null name + null result)
                        rules = rules.filter((r) => (r.ruleName ?? r.RuleName) || (r.result ?? r.Result));
                        if (!Array.isArray(rules) || rules.length === 0) return null;
                        return (
                          <div className="mt-3">
                            <div className="small fw-semibold mb-2 text-muted">
                              <i className="bi bi-gear me-1"></i>Applied Rules ({rules.length})
                            </div>
                            <div className="d-flex flex-column gap-1">
                              {rules.map((r, i) => {
                                const resultVal = (r.result ?? r.Result ?? '').toUpperCase();
                                const isPassed  = resultVal === 'PASS';
                                const isFailed  = resultVal === 'FAIL';
                                const isRouted  = resultVal === 'ROUTE';
                                const isApplied = resultVal === 'APPLIED';
                                // anything else (SKIPPED etc.) → grey neutral

                                const bgColor     = isPassed  ? '#f0fdf4'
                                                  : isFailed  ? '#fff5f5'
                                                  : isRouted  ? '#fffbeb'
                                                  : isApplied ? '#eff6ff'
                                                  : '#f9fafb';

                                const borderColor = isPassed  ? '#bbf7d0'
                                                  : isFailed  ? '#fecaca'
                                                  : isRouted  ? '#fde68a'
                                                  : isApplied ? '#bfdbfe'
                                                  : '#e5e7eb';

                                const iconClass   = isPassed  ? 'bi-check-circle-fill text-success'
                                                  : isFailed  ? 'bi-x-circle-fill text-danger'
                                                  : isRouted  ? 'bi-arrow-right-circle-fill text-warning'
                                                  : isApplied ? 'bi-info-circle-fill text-primary'
                                                  : 'bi-dash-circle text-secondary';

                                const labelColor  = isPassed  ? '#16a34a'
                                                  : isFailed  ? '#dc2626'
                                                  : isRouted  ? '#d97706'
                                                  : isApplied ? '#2563eb'
                                                  : '#6b7280';

                                return (
                                  <div
                                    key={i}
                                    className="d-flex align-items-center justify-content-between px-3 py-2 rounded"
                                    style={{
                                      background: bgColor,
                                      border: `1px solid ${borderColor}`,
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    <div>
                                      <i className={`bi ${iconClass} me-2`}></i>
                                      <span className="fw-semibold">{r.ruleName ?? r.RuleName ?? 'Rule'}</span>
                                      {(r.reason ?? r.Reason) && (
                                        <span className="text-muted ms-2">— {r.reason ?? r.Reason}</span>
                                      )}
                                    </div>
                                    <span
                                      className="fw-semibold"
                                      style={{ color: labelColor, whiteSpace: 'nowrap' }}
                                    >
                                      {resultVal || '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="light" className="rounded-pill px-4" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}


