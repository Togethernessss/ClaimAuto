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
  claim,
  loadingDetail,
  uploadingDoc,
  uploadError,
  uploadSuccess,
  proceedLoading,
  proceedError,
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  currentUserId,
  onHide,
  onUploadDocument,
  onDeleteDocument,
  onVerifyDocument,
  onProceedToAdjudication,
}) {
  const [activeTab,      setActiveTab]      = useState('info');
  const [docType,        setDocType]        = useState('Invoice');
  const [fileName,       setFileName]       = useState('');
  const [deletingDocId,  setDeletingDocId]  = useState(null);
  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [previewDocId,   setPreviewDocId]   = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (show) {
      setActiveTab('info');
      setDocType('Invoice');
      setFileName('');
      setDeletingDocId(null);
      setVerifyingDocId(null);
      setPreviewDocId(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [show]);

  // ── Document permission helpers ─────────────────────────────────────────
  const finalStatuses  = ['Approved', 'Rejected', 'Paid'];
  const claimFinalized = finalStatuses.includes(claim?.status);

  // Who can upload:
  //   Staff/Admin — any non-finalized claim
  //   Hospital/Policyholder — only while in the document review window (Submitted legacy or DocsVerificationPending)
  const docReviewWindow = claim?.status === 'Submitted' || claim?.status === 'DocsVerificationPending';
  const canUpload = !claimFinalized && (
    (isAdmin || isStaff) || ((isHospital || isPolicyholder) && docReviewWindow)
  );

  // Who can delete a specific document
  const canDeleteDoc = (doc) => {
    if (doc.status === 'Verified') return false;   // audit trail — never deletable once verified
    if (claimFinalized) return false;
    if (isAdmin) return true;
    if (isStaff) return true;
    return doc.uploadedByID === currentUserId && docReviewWindow;
  };

  // Who can verify/reject a document
  const canVerifyDoc = (doc) =>
    (isAdmin || isStaff) && doc.status === 'Pending' && !claimFinalized;

  // Hospital/Policyholder cannot view the document list once a claim is finalized.
  // Staff/Admin always have full access for audit purposes.
  const canViewDocs = (isAdmin || isStaff) || !claimFinalized;

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

                  {/* Lock notice for finalized claims */}
                  {claimFinalized && (
                    <div
                      className="rounded-3 p-2 mb-3 d-flex align-items-center gap-2"
                      style={{ background: '#fff8e1', border: '1px solid #ffe082' }}
                    >
                      <i className="bi bi-lock-fill text-warning"></i>
                      <span className="small text-muted">
                        This claim is <strong>{claim?.status}</strong> — its document set is locked and cannot be modified.
                      </span>
                    </div>
                  )}

                  {/* ── Proceed to Adjudication panel — Staff/Admin only ─────────────────── */}
                  {/* Shown only while the claim is awaiting document verification.          */}
                  {/* The button is disabled until every document is Verified or Rejected,   */}
                  {/* enforcing that staff cannot silently skip document review.              */}
                  {(isAdmin || isStaff) && claim?.status === 'DocsVerificationPending' && (
                    <div
                      className="rounded-3 p-3 mb-3"
                      style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}
                    >
                      <div className="small fw-semibold mb-1" style={{ color: '#2e7d32' }}>
                        <i className="bi bi-cpu me-2"></i>
                        Ready to Adjudicate?
                      </div>
                      {(() => {
                        const pendingCount = (claim.claimDocuments ?? [])
                          .filter((d) => d.status === 'Pending').length;
                        return (
                          <>
                            {pendingCount > 0 ? (
                              <div className="small text-muted mb-2">
                                <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                                {pendingCount} document{pendingCount !== 1 ? 's are' : ' is'} still
                                unreviewed. Verify or reject all documents before proceeding.
                              </div>
                            ) : (
                              <div className="small text-muted mb-2">
                                All documents have been reviewed. You can now proceed to fraud
                                scoring and auto-adjudication.
                              </div>
                            )}
                            {proceedError && (
                              <div
                                className="small text-danger mb-2 d-flex align-items-center gap-1"
                              >
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                {proceedError}
                              </div>
                            )}
                            <Button
                              variant="success"
                              size="sm"
                              className="fw-semibold px-3"
                              disabled={pendingCount > 0 || proceedLoading}
                              onClick={() => onProceedToAdjudication(claim.claimID)}
                            >
                              {proceedLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-play-circle-fill me-2"></i>
                                  Proceed to Adjudication
                                </>
                              )}
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Document list — hidden for Hospital/Policyholder on finalized claims */}
                  {!canViewDocs ? (
                    <div className="text-center py-4 text-muted small">
                      <i className="bi bi-shield-lock" style={{ fontSize: 36, color: '#ffc107' }}></i>
                      <div className="mt-2 fw-semibold">Documents Restricted</div>
                      <div>Document access is not available after a claim is finalized.</div>
                      <div className="mt-1">Contact your insurance provider for document queries.</div>
                    </div>
                  ) : !claim.claimDocuments || claim.claimDocuments.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      <i className="bi bi-file-earmark-x" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                      <div className="mt-2">No documents attached yet.</div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {claim.claimDocuments.map((doc) => {
                        const docFileName = doc.fileURI?.split('/').pop() ?? doc.docType;
                        const isRealUrl   = doc.fileURI?.startsWith('http://') || doc.fileURI?.startsWith('https://');
                        const isExpanded  = previewDocId === doc.docID;
                        return (
                          <div
                            key={doc.docID}
                            className="rounded-3"
                            style={{ background: '#f8f9fa', border: `1px solid ${isExpanded ? '#c7d7f9' : '#e9ecef'}` }}
                          >
                            <div className="d-flex align-items-center justify-content-between px-3 py-2">
                              <div className="d-flex align-items-center gap-2 flex-grow-1 me-2" style={{ minWidth: 0 }}>
                                <i className="bi bi-file-earmark-pdf text-danger fs-5 flex-shrink-0"></i>
                                <div style={{ minWidth: 0 }}>
                                  <div className="small fw-semibold text-truncate" title={docFileName}>
                                    {docFileName}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {doc.docType} · by {doc.uploadedByName} · {formatDate(doc.uploadedAt)}
                                    {doc.verifiedByName && (
                                      <span
                                        className={`ms-2 fw-semibold ${doc.status === 'Verified' ? 'text-success' : 'text-danger'}`}
                                      >
                                        · {doc.status} by {doc.verifiedByName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                <Badge
                                  bg={docStatusVariant(doc.status)}
                                  className="px-2 py-1 me-1"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {doc.status}
                                </Badge>
                                {/* View */}
                                <Button
                                  variant={isExpanded ? 'secondary' : 'outline-secondary'}
                                  size="sm"
                                  className="p-1"
                                  style={{ lineHeight: 1 }}
                                  title={isRealUrl ? 'Open file' : 'View document details'}
                                  onClick={() => {
                                    if (isRealUrl) {
                                      window.open(doc.fileURI, '_blank');
                                    } else {
                                      setPreviewDocId(isExpanded ? null : doc.docID);
                                    }
                                  }}
                                >
                                  <i className="bi bi-eye" style={{ fontSize: '0.75rem' }}></i>
                                </Button>
                                {/* Verify / Reject — Staff + Admin only */}
                                {canVerifyDoc(doc) && (
                                  <>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      className="p-1"
                                      style={{ lineHeight: 1 }}
                                      title="Mark as Verified"
                                      disabled={verifyingDocId === doc.docID}
                                      onClick={async () => {
                                        setVerifyingDocId(doc.docID);
                                        await onVerifyDocument(claim.claimID, doc.docID, 'Verified');
                                        setVerifyingDocId(null);
                                      }}
                                    >
                                      {verifyingDocId === doc.docID
                                        ? <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
                                        : <i className="bi bi-check-lg" style={{ fontSize: '0.75rem' }}></i>
                                      }
                                    </Button>
                                    <Button
                                      variant="outline-warning"
                                      size="sm"
                                      className="p-1"
                                      style={{ lineHeight: 1 }}
                                      title="Reject document"
                                      disabled={verifyingDocId === doc.docID}
                                      onClick={async () => {
                                        setVerifyingDocId(doc.docID);
                                        await onVerifyDocument(claim.claimID, doc.docID, 'Rejected');
                                        setVerifyingDocId(null);
                                      }}
                                    >
                                      {verifyingDocId === doc.docID
                                        ? <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
                                        : <i className="bi bi-x-lg" style={{ fontSize: '0.75rem' }}></i>
                                      }
                                    </Button>
                                  </>
                                )}
                                {/* Delete */}
                                {canDeleteDoc(doc) && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="p-1"
                                    style={{ lineHeight: 1 }}
                                    title="Delete document"
                                    disabled={deletingDocId === doc.docID}
                                    onClick={async () => {
                                      setDeletingDocId(doc.docID);
                                      await onDeleteDocument(claim.claimID, doc.docID);
                                      setDeletingDocId(null);
                                    }}
                                  >
                                    {deletingDocId === doc.docID
                                      ? <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
                                      : <i className="bi bi-trash3" style={{ fontSize: '0.75rem' }}></i>
                                    }
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Inline document preview (shown when no real URL) */}
                            {isExpanded && (
                              <div
                                className="px-3 pb-3 pt-2"
                                style={{ borderTop: '1px dashed #c7d7f9' }}
                              >
                                <div className="d-flex flex-column gap-1" style={{ fontSize: '0.8rem' }}>
                                  <div>
                                    <span className="text-muted me-2">File name:</span>
                                    <span className="fw-semibold font-monospace">{docFileName}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted me-2">Type:</span>
                                    <span className="fw-semibold">{doc.docType}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted me-2">Uploaded by:</span>
                                    <span>{doc.uploadedByName} on {formatDate(doc.uploadedAt)}</span>
                                  </div>
                                  {doc.sha256 && (
                                    <div>
                                      <span className="text-muted me-2">SHA-256:</span>
                                      <span
                                        className="font-monospace text-muted"
                                        style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}
                                        title="Cryptographic hash — used to verify the file has not been tampered with"
                                      >
                                        {doc.sha256}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    className="mt-1 d-flex align-items-center gap-1"
                                    style={{ color: '#0d6efd', fontSize: '0.75rem' }}
                                  >
                                    <i className="bi bi-info-circle"></i>
                                    In production, this button opens the file directly from cloud storage.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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


