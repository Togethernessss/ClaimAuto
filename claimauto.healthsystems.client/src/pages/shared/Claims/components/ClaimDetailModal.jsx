// src/pages/shared/Claims/components/ClaimDetailModal.jsx
// Merged: DevelopmentBackup (Payment tab) + frontend/claim (Reject Claim, Re-upload docs)
import { useState, useRef, useEffect } from 'react';
import {
  Modal, Tab, Tabs, Badge, Button, Alert, Spinner, Table,
} from 'react-bootstrap';
import { getAllPayments } from '../../../../services/payments/paymentService';
import {
  formatDate, formatDateTime, formatCurrency,
  statusVariant, statusLabel,
  priorityVariant, priorityTextColor,
  claimTypeVariant, claimTypeIcon,
  docStatusVariant, lineStatusVariant,
  adjDecisionVariant, DOC_TYPES,
  computeSHA256,
} from '../utils/claimHelpers';
import RejectClaimModal from './RejectClaimModal';
import api from '../../../../api/axiosClient';

// ── Claim timeline stages (Policyholder view) ────────────────────────────────
const TIMELINE_STAGES = [
  {
    key:         'submitted',
    label:       'Claim Submitted',
    description: 'Your claim has been received and registered in our system.',
    icon:        'bi-cloud-upload-fill',
    activeColor: '#7c3aed',
  },
  {
    key:         'docs_verification',
    label:       'Document Verification',
    description: 'Our team is reviewing the supporting documents attached to your claim.',
    icon:        'bi-file-earmark-check-fill',
    activeColor: '#2563eb',
  },
  {
    key:         'under_review',
    label:       'Under Review',
    description: 'Your claim is being carefully evaluated by our insurance specialists.',
    icon:        'bi-search',
    activeColor: '#0891b2',
  },
  {
    key:         'adjudication',
    label:       'Adjudication',
    description: 'Automated rules and manual review criteria are being applied to your claim.',
    icon:        'bi-cpu-fill',
    activeColor: '#d97706',
  },
  {
    key:         'decision',
    label:       'Final Decision',
    description: 'A final decision is being prepared for your claim.',
    icon:        'bi-patch-check-fill',
    activeColor: '#16a34a',
  },
];

function getStageState(stageKey, claimStatus) {
  const terminal = ['Approved', 'Paid', 'Rejected'];
  switch (stageKey) {
    case 'submitted':
      return 'done';
    case 'docs_verification':
      if (['UnderReview', ...terminal].includes(claimStatus)) return 'done';
      if (claimStatus === 'DocsVerificationPending') return 'active';
      return 'pending';
    case 'under_review':
      if (terminal.includes(claimStatus)) return 'done';
      if (claimStatus === 'UnderReview') return 'active';
      return 'pending';
    case 'adjudication':
      if (terminal.includes(claimStatus)) return 'done';
      // No intermediate status exists — adjudication is instantaneous
      return 'pending';
    case 'decision':
      if (terminal.includes(claimStatus)) return 'done';
      return 'pending';
    default:
      return 'pending';
  }
}

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
  // frontend/claim additions — wire up in Claims.jsx to enable Reject + Re-upload
  onRejectClaim,
  onReplaceDocument,
  // manual adjudication — Staff/Admin decision for UnderReview claims
  onManualAdjudicate,
}) {
  // ── state (merged from both branches) ──────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState('info');
  const [docType,          setDocType]          = useState('Invoice');
  const [fileName,         setFileName]         = useState('');
  const [deletingDocId,    setDeletingDocId]    = useState(null);
  const [verifyingDocId,   setVerifyingDocId]   = useState(null);
  const [previewDocId,     setPreviewDocId]     = useState(null);
  const [payment,          setPayment]          = useState(null);       // DevelopmentBackup
  const [paymentLoading,   setPaymentLoading]   = useState(false);     // DevelopmentBackup
  const [showRejectModal,  setShowRejectModal]  = useState(false);     // frontend/claim
  const [reuploadingDocId, setReuploadingDocId] = useState(null);      // frontend/claim
  const fileRef = useRef(null);

  // ── 1-hour Hospital edit window (tick every 30 s so display stays fresh) ──
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── reset all state when modal opens ───────────────────────────────────────
  useEffect(() => {
    if (show) {
      setActiveTab('info');
      setDocType('Invoice');
      setFileName('');
      setDeletingDocId(null);
      setVerifyingDocId(null);
      setPreviewDocId(null);
      setPayment(null);
      setPaymentLoading(false);
      setShowRejectModal(false);
      setReuploadingDocId(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [show]);

  // ── load payment when Payment tab is opened (DevelopmentBackup) ────────────
  useEffect(() => {
    if (activeTab !== 'payment' || !claim?.claimID) return;
    setPaymentLoading(true);
    getAllPayments(null, claim.claimID)
      .then((list) => setPayment(list?.[0] ?? null))
      .catch(() => setPayment(null))
      .finally(() => setPaymentLoading(false));
  }, [activeTab, claim?.claimID]);

  // ── document permission helpers ─────────────────────────────────────────────
  const finalStatuses  = ['Approved', 'Rejected', 'Paid'];
  const claimFinalized = finalStatuses.includes(claim?.status);
  const docReviewWindow = claim?.status === 'Submitted' || claim?.status === 'DocsVerificationPending';

  // ── Hospital 1-hour document-edit window ─────────────────────────────────
  // .NET JSON serialisers often emit UTC datetimes WITHOUT the 'Z' suffix
  // (e.g. "2026-05-30T07:06:00").  A browser in IST then silently treats that
  // string as *local* time, making `submittedMs` appear 5 h 30 m earlier than
  // it really is — so every fresh claim looks "expired".  We fix this by
  // appending 'Z' whenever the string has no explicit timezone marker.
  function toUtcMs(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    const hasZone =
      s.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(s);
    const ms = new Date(hasZone ? s : s + 'Z').getTime();
    return isNaN(ms) ? null : ms;
  }

  const ONE_HOUR_MS     = 60 * 60 * 1000;
  const submittedMs     = toUtcMs(claim?.submittedAt);
  const msSinceSubmit   = submittedMs != null ? now - submittedMs : null;
  const withinEditWindow = isHospital &&
    msSinceSubmit != null &&
    msSinceSubmit < ONE_HOUR_MS &&
    !claimFinalized;
  const editWindowExpired = isHospital &&
    msSinceSubmit != null &&
    msSinceSubmit >= ONE_HOUR_MS &&
    !claimFinalized;
  const msRemaining   = withinEditWindow ? ONE_HOUR_MS - msSinceSubmit : 0;
  const minutesLeft   = Math.ceil(msRemaining / 60_000);

  // Only Hospital/Policyholder can upload documents:
  //   - Hospital: within the 1-hour edit window (any claim status, not finalized)
  //   - Policyholder: only while the claim is still Submitted
  // Staff and Admin cannot upload — they verify/reject documents only.
  const canUpload = !claimFinalized && (
    (isHospital   && withinEditWindow) ||
    (isPolicyholder && claim?.status === 'Submitted')
  );

  const canDeleteDoc = (doc) => {
    if (doc.status === 'Verified') return false;
    if (claimFinalized) return false;
    if (isAdmin || isStaff) return true;
    if (doc.uploadedByID !== currentUserId) return false;
    if (isHospital)      return withinEditWindow;
    return isPolicyholder && claim?.status === 'Submitted';
  };

  const canVerifyDoc = (doc) =>
    (isAdmin || isStaff) && doc.status === 'Pending' && !claimFinalized;

  // Hospital/PH can re-upload their own rejected docs:
  // Hospital: within the 1-hour window | PH: while docReviewWindow is active
  const canReuploadDoc = (doc) => {
    if (doc.status !== 'Rejected') return false;
    if (claimFinalized) return false;
    if (doc.uploadedByID !== currentUserId) return false;
    if (isHospital)      return withinEditWindow;
    return isPolicyholder && docReviewWindow;
  };

  const canViewDocs = (isAdmin || isStaff) || !claimFinalized;

  // ── upload handlers ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleUpload = async () => {
    if (!fileName || !claim) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    // Pass the raw file and docType — Claims.jsx handles the actual upload + SHA256
    onUploadDocument(claim.claimID, file, docType);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Secure file preview — fetches via JWT so [Authorize] is respected ─────
  const handlePreviewFile = async (fileURI) => {
    try {
      const response = await api.get(fileURI, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch {
      // file unavailable — silently ignore (user will see new tab fail to open)
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
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

              {/* ── Scrollable tab bar: ensures Timeline tab is always reachable ── */}
              <style>{`
                .cdm-tabs .nav.nav-tabs {
                  flex-wrap: nowrap;
                  overflow-x: auto;
                  scrollbar-width: none;
                  -ms-overflow-style: none;
                  padding-bottom: 1px;
                }
                .cdm-tabs .nav.nav-tabs::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="cdm-tabs">
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">

                {/* ── TAB 1: INFO ─────────────────────────────────── */}
                <Tab eventKey="info" title={<><i className="bi bi-info-circle me-1"></i>Info</>}>
                  <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                    <div className="rounded-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                      {[
                        { label: 'Member',      value: claim.memberName,                   icon: 'bi-person' },
                        { label: 'Provider',    value: claim.providerName,                 icon: 'bi-hospital' },
                        { label: 'Policy',      value: claim.policyName,                   icon: 'bi-shield-check' },
                        { label: 'Total Billed',value: formatCurrency(claim.totalBilledAmount), icon: 'bi-cash-coin' },
                        { label: 'Currency',    value: claim.currency,                     icon: 'bi-currency-rupee' },
                        { label: 'Source',      value: claim.sourceChannel,                icon: 'bi-send' },
                        { label: 'Received At', value: formatDateTime(claim.receivedAt),   icon: 'bi-clock' },
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

                {/* ── TAB 2: LINES ────────────────────────────────── */}
                <Tab
                  eventKey="lines"
                  title={
                    <>
                      <i className="bi bi-list-ul me-1"></i>Lines
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
                              <td className="ps-3 py-2 small fw-semibold font-monospace">{line.serviceCode}</td>
                              <td className="py-2 small">{formatDate(line.serviceDate)}</td>
                              <td className="py-2 small">{line.quantity}</td>
                              <td className="py-2 small">{formatCurrency(line.unitPrice)}</td>
                              <td className="py-2 small fw-semibold">{formatCurrency(line.lineBilledAmount)}</td>
                              <td className="py-2">
                                <Badge bg={lineStatusVariant(line.lineStatus)} className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
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

                {/* ── TAB 3: DOCUMENTS ────────────────────────────── */}
                <Tab
                  eventKey="documents"
                  title={
                    <>
                      <i className="bi bi-paperclip me-1"></i>Documents
                      {claim.claimDocuments?.length > 0 && (
                        <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.65rem' }}>
                          {claim.claimDocuments.length}
                        </Badge>
                      )}
                    </>
                  }
                >
                  <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>

                    {/* ── Upload panel ─────────────────────────────── */}
                    {canUpload && (
                      <div className="rounded-3 p-3 mb-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <div className="small fw-semibold mb-2">
                          <i className="bi bi-upload me-2 text-primary"></i>Attach a Document
                        </div>
                        {uploadSuccess && (
                          <Alert variant="success" className="py-2 small mb-2">
                            <i className="bi bi-check-circle-fill me-2"></i>{uploadSuccess}
                          </Alert>
                        )}
                        {uploadError && (
                          <Alert variant="danger" className="py-2 small mb-2">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>{uploadError}
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
                              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
                            {uploadingDoc
                              ? <><Spinner animation="border" size="sm" className="me-1" />Uploading...</>
                              : <><i className="bi bi-upload me-1"></i>Upload</>
                            }
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── Hospital 1-hour edit window banners ──────── */}
                    {withinEditWindow && (
                      <div
                        className="rounded-3 p-3 mb-3 d-flex align-items-start gap-2"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                      >
                        <i className="bi bi-clock-history text-primary flex-shrink-0 mt-1"></i>
                        <div>
                          <div className="small fw-semibold mb-1" style={{ color: '#1e40af' }}>
                            Document Edit Window Open
                          </div>
                          <div className="small text-muted">
                            You can upload, delete, or replace documents for{' '}
                            <strong>{minutesLeft} more minute{minutesLeft !== 1 ? 's' : ''}</strong>.
                            After this window closes only staff can manage documents.
                          </div>
                        </div>
                      </div>
                    )}
                    {editWindowExpired && (
                      <div
                        className="rounded-3 p-2 mb-3 d-flex align-items-center gap-2"
                        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                      >
                        <i className="bi bi-lock-fill text-warning"></i>
                        <span className="small text-muted">
                          The <strong>1-hour document edit window</strong> has expired.
                          Contact insurance staff to modify documents.
                        </span>
                      </div>
                    )}

                    {/* ── Rejected-docs warning banner (Hospital/PH) ─ */}
                    {/* frontend/claim: shows when the provider has rejected docs to fix */}
                    {(isHospital || isPolicyholder) && claim?.status === 'DocsVerificationPending' && (() => {
                      const rejectedOwn = (claim.claimDocuments ?? [])
                        .filter((d) => d.status === 'Rejected' && d.uploadedByID === currentUserId);
                      if (rejectedOwn.length === 0) return null;
                      return (
                        <div
                          className="rounded-3 p-3 mb-3 d-flex align-items-start gap-2"
                          style={{ background: '#fff8e1', border: '1px solid #fde68a' }}
                        >
                          <i className="bi bi-exclamation-triangle-fill text-warning mt-1 flex-shrink-0"></i>
                          <div>
                            <div className="small fw-semibold mb-1" style={{ color: '#92400e' }}>
                              {rejectedOwn.length} of your document{rejectedOwn.length !== 1 ? 's have' : ' has'} been rejected
                            </div>
                            <div className="small text-muted">
                              Click the <i className="bi bi-arrow-clockwise text-primary"></i> <strong>re-upload</strong> button
                              on each rejected document to submit a corrected version.
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Finalized lock notice ─────────────────────── */}
                    {claimFinalized && (
                      <div
                        className="rounded-3 p-2 mb-3 d-flex align-items-center gap-2"
                        style={{ background: '#fff8e1', border: '1px solid #ffe082' }}
                      >
                        <i className="bi bi-lock-fill text-warning"></i>
                        <span className="small text-muted">
                          This claim is <strong>{claim?.status}</strong> — its document set is locked.
                        </span>
                      </div>
                    )}

                    {/* ── Proceed to Adjudication panel (Staff/Admin) ── */}
                    {/* frontend/claim: all-rejected state shows reject option  */}
                    {(isAdmin || isStaff) && claim?.status === 'DocsVerificationPending' && (() => {
                      const docs         = claim.claimDocuments ?? [];
                      const pendingCount = docs.filter((d) => d.status === 'Pending').length;
                      const verifiedCount= docs.filter((d) => d.status === 'Verified').length;
                      const rejectedCount= docs.filter((d) => d.status === 'Rejected').length;
                      const allRejected  = pendingCount === 0 && verifiedCount === 0 && rejectedCount > 0;

                      if (allRejected) {
                        return (
                          <div
                            className="rounded-3 p-3 mb-3"
                            style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}
                          >
                            <div className="small fw-semibold mb-1" style={{ color: '#b91c1c' }}>
                              <i className="bi bi-x-circle-fill me-2"></i>All Documents Rejected
                            </div>
                            <div className="small text-muted mb-2">
                              Every submitted document has been rejected and no verified documents remain.
                              You may reject this claim now, or wait for the provider to re-upload corrected documents.
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              className="fw-semibold px-3"
                              onClick={() => setShowRejectModal(true)}
                            >
                              <i className="bi bi-x-circle-fill me-2"></i>Reject Claim
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div
                          className="rounded-3 p-3 mb-3"
                          style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}
                        >
                          <div className="small fw-semibold mb-1" style={{ color: '#2e7d32' }}>
                            <i className="bi bi-cpu me-2"></i>Ready to Adjudicate?
                          </div>
                          {pendingCount > 0 ? (
                            <div className="small text-muted mb-2">
                              <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                              {pendingCount} document{pendingCount !== 1 ? 's are' : ' is'} still unreviewed.
                              Verify or reject all documents before proceeding.
                            </div>
                          ) : rejectedCount > 0 ? (
                            <div className="small text-muted mb-2">
                              <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i>
                              {rejectedCount} document{rejectedCount !== 1 ? 's have' : ' has'} been rejected.
                              Waiting for provider to re-upload before adjudication can proceed.
                            </div>
                          ) : (
                            <div className="small text-muted mb-2">
                              All documents verified. You can now proceed to fraud scoring and auto-adjudication.
                            </div>
                          )}
                          {proceedError && (
                            <div className="small text-danger mb-2 d-flex align-items-center gap-1">
                              <i className="bi bi-exclamation-triangle-fill"></i>{proceedError}
                            </div>
                          )}
                          <Button
                            variant="success"
                            size="sm"
                            className="fw-semibold px-3"
                            disabled={!(pendingCount === 0 && rejectedCount === 0 && verifiedCount > 0) || proceedLoading}
                            onClick={() => onProceedToAdjudication(claim.claimID)}
                          >
                            {proceedLoading
                              ? <><Spinner animation="border" size="sm" className="me-2" />Processing...</>
                              : <><i className="bi bi-play-circle-fill me-2"></i>Proceed to Adjudication</>
                            }
                          </Button>
                        </div>
                      );
                    })()}

                    {/* ── Document list ─────────────────────────────── */}
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
                          const showReupload = canReuploadDoc(doc);
                          const showDelete   = canDeleteDoc(doc) && !showReupload;

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
                                    <div className="small fw-semibold text-truncate" title={docFileName}>{docFileName}</div>
                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                      {doc.docType} · by {doc.uploadedByName} · {formatDate(doc.uploadedAt)}
                                      {doc.verifiedByName && (
                                        <span className={`ms-2 fw-semibold ${doc.status === 'Verified' ? 'text-success' : 'text-danger'}`}>
                                          · {doc.status} by {doc.verifiedByName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                  <Badge bg={docStatusVariant(doc.status)} className="px-2 py-1 me-1" style={{ fontSize: '0.7rem' }}>
                                    {doc.status}
                                  </Badge>

                                  {/* View */}
                                  <Button
                                    variant={isExpanded ? 'secondary' : 'outline-secondary'}
                                    size="sm" className="p-1" style={{ lineHeight: 1 }}
                                    title={isRealUrl ? 'Open file' : 'View details'}
                                    onClick={() => {
                                      if (isRealUrl) handlePreviewFile(doc.fileURI);
                                      else setPreviewDocId(isExpanded ? null : doc.docID);
                                    }}
                                  >
                                    <i className="bi bi-eye" style={{ fontSize: '0.75rem' }}></i>
                                  </Button>

                                  {/* Verify / Reject — Staff/Admin only */}
                                  {canVerifyDoc(doc) && (
                                    <>
                                      <Button
                                        variant="outline-success" size="sm" className="p-1" style={{ lineHeight: 1 }}
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
                                        variant="outline-warning" size="sm" className="p-1" style={{ lineHeight: 1 }}
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

                                  {/* Re-upload — Hospital/PH on their own rejected docs (frontend/claim) */}
                                  {showReupload && (
                                    <>
                                      <input
                                        type="file"
                                        id={`reupload-${doc.docID}`}
                                        style={{ display: 'none' }}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !onReplaceDocument) return;
                                          setReuploadingDocId(doc.docID);
                                          try {
                                            await onReplaceDocument(claim.claimID, doc.docID, file);
                                          } finally {
                                            setReuploadingDocId(null);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                      <Button
                                        variant="outline-primary" size="sm" className="p-1" style={{ lineHeight: 1 }}
                                        title={`Re-upload corrected ${doc.docType}`}
                                        disabled={reuploadingDocId === doc.docID}
                                        onClick={() => document.getElementById(`reupload-${doc.docID}`)?.click()}
                                      >
                                        {reuploadingDocId === doc.docID
                                          ? <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
                                          : <i className="bi bi-arrow-clockwise" style={{ fontSize: '0.75rem' }}></i>
                                        }
                                      </Button>
                                    </>
                                  )}

                                  {/* Delete */}
                                  {showDelete && (
                                    <Button
                                      variant="outline-danger" size="sm" className="p-1" style={{ lineHeight: 1 }}
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

                              {/* Inline preview */}
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px dashed #c7d7f9' }}>
                                  <div className="d-flex flex-column gap-1" style={{ fontSize: '0.8rem' }}>
                                    <div><span className="text-muted me-2">File name:</span><span className="fw-semibold font-monospace">{docFileName}</span></div>
                                    <div><span className="text-muted me-2">Type:</span><span className="fw-semibold">{doc.docType}</span></div>
                                    <div><span className="text-muted me-2">Uploaded by:</span><span>{doc.uploadedByName} on {formatDate(doc.uploadedAt)}</span></div>
                                    {doc.sha256 && (
                                      <div>
                                        <span className="text-muted me-2">SHA-256:</span>
                                        <span className="font-monospace text-muted" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                          {doc.sha256}
                                        </span>
                                      </div>
                                    )}
                                    <div className="mt-1 d-flex align-items-center gap-1" style={{ color: '#0d6efd', fontSize: '0.75rem' }}>
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

                {/* ── TAB 4: ADJUDICATION ─────────────────────────── */}
                <Tab eventKey="adjudication" title={<><i className="bi bi-cpu me-1"></i>Adjudication</>}>
                  <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                    {!claim.adjudication ? (
                      <div className="text-center py-4 text-muted small">
                        <i className="bi bi-cpu" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                        <div className="mt-2 fw-semibold">Not yet adjudicated</div>
                        <div>This claim is waiting for the adjudication engine to process it.</div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="rounded-3 p-3 mb-3 text-center"
                          style={{
                            background: ['Approved','Paid'].includes(claim.adjudication.decision)
                              ? '#d1f2eb' : claim.adjudication.decision === 'Partial'
                                ? '#e3f2fd' : claim.adjudication.decision === 'Denied'
                                  ? '#ffebee' : '#fff8e1',
                            border: `1px solid ${['Approved','Paid'].includes(claim.adjudication.decision) ? '#a5d6a7'
                              : claim.adjudication.decision === 'Partial' ? '#90caf9'
                                : claim.adjudication.decision === 'Denied' ? '#ef9a9a' : '#ffe082'}`,
                          }}
                        >
                          <Badge bg={adjDecisionVariant(claim.adjudication.decision)} className="px-3 py-2 fs-6">
                            {claim.adjudication.decision}
                          </Badge>
                          <div className="small text-muted mt-2">
                            Decided on {formatDateTime(claim.adjudication.executedAt)}
                            {' '}by <strong>{claim.adjudication.performedByName}</strong>
                          </div>
                        </div>

                        <div className="rounded-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                          {[
                            { label: 'Engine Version', value: claim.adjudication.engineVersion, icon: 'bi-cpu' },
                            { label: 'Performed By',   value: claim.adjudication.performedByName, icon: 'bi-person' },
                            { label: 'Notes',          value: claim.adjudication.notes, icon: 'bi-chat-text' },
                          ].filter((r) => r.value).map((row, idx, arr) => (
                            <div
                              key={row.label}
                              className="d-flex align-items-start justify-content-between px-3"
                              style={{ padding: '10px 12px', borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}
                            >
                              <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '0.8rem', minWidth: 130 }}>
                                <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>{row.label}
                              </div>
                              <div className="fw-semibold text-end" style={{ fontSize: '0.85rem' }}>{row.value}</div>
                            </div>
                          ))}
                        </div>

                        {claim.adjudication.appliedRulesJSON && (() => {
                          if (claim.adjudication.engineVersion === 'manual') {
                            return (
                              <div className="mt-3">
                                <div className="small fw-semibold mb-2 text-muted"><i className="bi bi-gear me-1"></i>Applied Rules</div>
                                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded" style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: '0.8rem' }}>
                                  <i className="bi bi-person-check text-secondary"></i>
                                  <span className="text-muted">Manually adjudicated by staff — no automated rules were applied.</span>
                                </div>
                              </div>
                            );
                          }
                          let rules = [];
                          try { rules = JSON.parse(claim.adjudication.appliedRulesJSON); } catch { rules = []; }
                          rules = rules.filter((r) => (r.ruleName ?? r.RuleName) || (r.result ?? r.Result));
                          if (!Array.isArray(rules) || rules.length === 0) return null;
                          return (
                            <div className="mt-3">
                              <div className="small fw-semibold mb-2 text-muted">
                                <i className="bi bi-gear me-1"></i>Applied Rules ({rules.length})
                              </div>
                              <div className="d-flex flex-column gap-1">
                                {rules.map((r, i) => {
                                  const resultVal  = (r.result ?? r.Result ?? '').toUpperCase();
                                  const isPassed   = resultVal === 'PASS';
                                  const isFailed   = resultVal === 'FAIL';
                                  const isRouted   = resultVal === 'ROUTE';
                                  const isApplied  = resultVal === 'APPLIED';
                                  const bgColor    = isPassed ? '#f0fdf4' : isFailed ? '#fff5f5' : isRouted ? '#fffbeb' : isApplied ? '#eff6ff' : '#f9fafb';
                                  const borderColor= isPassed ? '#bbf7d0' : isFailed ? '#fecaca' : isRouted ? '#fde68a' : isApplied ? '#bfdbfe' : '#e5e7eb';
                                  const iconClass  = isPassed ? 'bi-check-circle-fill text-success' : isFailed ? 'bi-x-circle-fill text-danger' : isRouted ? 'bi-arrow-right-circle-fill text-warning' : isApplied ? 'bi-info-circle-fill text-primary' : 'bi-dash-circle text-secondary';
                                  const labelColor = isPassed ? '#16a34a' : isFailed ? '#dc2626' : isRouted ? '#d97706' : isApplied ? '#2563eb' : '#6b7280';
                                  return (
                                    <div key={i} className="d-flex align-items-center justify-content-between px-3 py-2 rounded"
                                      style={{ background: bgColor, border: `1px solid ${borderColor}`, fontSize: '0.8rem' }}>
                                      <div>
                                        <i className={`bi ${iconClass} me-2`}></i>
                                        <span className="fw-semibold">{r.ruleName ?? r.RuleName ?? 'Rule'}</span>
                                        {(r.reason ?? r.Reason) && <span className="text-muted ms-2">— {r.reason ?? r.Reason}</span>}
                                      </div>
                                      <span className="fw-semibold" style={{ color: labelColor, whiteSpace: 'nowrap' }}>{resultVal || '—'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3.3 — Calculation breakdown. The backend serializes two
                            slightly different shapes (auto engine vs manual
                            adjudication), so we accept both key sets and render
                            whatever is present. */}
                        {claim.adjudication.calculationsJSON && (() => {
                          let calc = null;
                          try { calc = JSON.parse(claim.adjudication.calculationsJSON); }
                          catch { return null; }
                          if (!calc || typeof calc !== 'object') return null;

                          const rows = [
                            { label: 'Original Billed',     value: calc.billed       ?? calc.originalAmount, kind: 'billed'    },
                            { label: 'Allowed',             value: calc.allowed,                            kind: 'neutral'   },
                            { label: 'Deductible Applied',  value: calc.deductibleApplied ?? calc.totalDeducted, kind: 'deduct'},
                            { label: 'Co-Pay',              value: calc.copay,                              kind: 'deduct'    },
                            { label: 'Net Payable',         value: calc.payable      ?? calc.approvedAmount, kind: 'final'    },
                          ].filter(r => r.value !== undefined && r.value !== null);

                          if (rows.length === 0) return null;

                          return (
                            <div className="mt-3">
                              <div className="small fw-semibold mb-2 text-muted">
                                <i className="bi bi-calculator me-1"></i>Calculation Breakdown
                              </div>
                              <div
                                className="rounded"
                                style={{ background: '#f8f9fa', border: '1px solid #e9ecef', overflow: 'hidden' }}
                              >
                                <Table size="sm" className="mb-0">
                                  <tbody>
                                    {rows.map((r, i) => {
                                      const isFinal  = r.kind === 'final';
                                      const isDeduct = r.kind === 'deduct' && Number(r.value) > 0;
                                      return (
                                        <tr key={i} style={isFinal ? { borderTop: '2px solid #dee2e6' } : undefined}>
                                          <td className={isFinal ? 'fw-bold' : 'text-muted small'} style={{ paddingLeft: 12 }}>
                                            {r.label}
                                          </td>
                                          <td
                                            className={`text-end ${isFinal ? 'fw-bold text-success' : isDeduct ? 'text-danger' : 'fw-semibold'}`}
                                            style={{ paddingRight: 12, whiteSpace: 'nowrap' }}
                                          >
                                            {isDeduct ? '−' : ''}{formatCurrency(r.value)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </Tab>

                {/* ── TAB 5: PAYMENT / EOB (DevelopmentBackup) ───── */}
                <Tab eventKey="payment" title={<><i className="bi bi-credit-card me-1"></i>Payment</>}>
                  <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                    {paymentLoading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" size="sm" />
                        <div className="text-muted mt-2 small">Loading payment…</div>
                      </div>
                    ) : !payment ? (
                      <div className="text-center py-5 text-muted">
                        <i className="bi bi-credit-card" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
                        <div className="mt-2 fw-semibold">No payment record yet</div>
                        <div className="small">A payment is created automatically once the claim is approved.</div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="rounded-3 p-3 mb-3 text-center"
                          style={{
                            background: payment.status === 'Executed' ? '#d1f2eb' : payment.status === 'Pending' ? '#fff8e1' : payment.status === 'OnHold' ? '#fff3cd' : '#f8f9fa',
                            border: `1px solid ${payment.status === 'Executed' ? '#a5d6a7' : payment.status === 'Pending' ? '#ffe082' : payment.status === 'OnHold' ? '#ffc107' : '#dee2e6'}`,
                          }}
                        >
                          <Badge
                            bg={payment.status === 'Executed' ? 'success' : payment.status === 'Pending' ? 'warning' : payment.status === 'OnHold' ? 'warning' : 'secondary'}
                            className="px-3 py-2 fs-6"
                          >
                            {payment.status}
                          </Badge>
                          <div className="small text-muted mt-1">Payment ID: <strong>PAY-{payment.paymentID}</strong></div>
                        </div>

                        <div className="rounded-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                          {[
                            { label: 'Payee',    value: payment.payeeName,  icon: 'bi-person' },
                            { label: isPolicyholder ? 'Approved Amount' : 'Payment Amount',
                              value: `₹${Number(payment.amount).toLocaleString('en-IN')}`, icon: 'bi-cash-coin' },
                            { label: 'Currency', value: payment.currency,   icon: 'bi-currency-rupee' },
                            { label: 'Method',   value: payment.paymentMethod, icon: 'bi-bank' },
                            { label: 'Created',  value: formatDate(payment.createdAt), icon: 'bi-clock' },
                            payment.executedAt    ? { label: 'Executed',  value: formatDateTime(payment.executedAt),  icon: 'bi-check-circle' } : null,
                            payment.referenceNumber ? { label: 'Reference', value: payment.referenceNumber, icon: 'bi-hash' } : null,
                          ].filter(Boolean).map((row, idx, arr) => (
                            <div key={row.label} className="d-flex align-items-start justify-content-between px-3"
                              style={{ padding: '10px 12px', borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                              <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '0.8rem', minWidth: 130 }}>
                                <i className={row.icon} style={{ fontSize: '0.75rem' }}></i>{row.label}
                              </div>
                              <div className="fw-semibold text-end" style={{ fontSize: '0.85rem' }}>{row.value}</div>
                            </div>
                          ))}
                        </div>

                        {isPolicyholder && (
                          <div className="mt-3 rounded-3 p-3" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                            <div className="small fw-semibold mb-2" style={{ color: '#2e7d32' }}>
                              <i className="bi bi-file-earmark-text me-2"></i>Explanation of Benefits (EOB)
                            </div>
                            <div className="d-flex flex-column gap-1" style={{ fontSize: '0.85rem' }}>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Total Billed</span>
                                <span className="fw-semibold">₹{Number(claim.totalBilledAmount).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Amount Approved</span>
                                <span className="fw-semibold text-success">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                              </div>
                              {claim.totalBilledAmount > payment.amount && (
                                <div className="d-flex justify-content-between">
                                  <span className="text-muted">Not Covered</span>
                                  <span className="fw-semibold text-danger">₹{Number(claim.totalBilledAmount - payment.amount).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                            <div className="small text-muted mt-2">
                              <i className="bi bi-info-circle me-1"></i>
                              Payment is sent directly to your provider. Contact support if you have questions.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Tab>

                {/* ── TAB 6: TIMELINE (Policyholder only) ─────────── */}
                {isPolicyholder && (
                  <Tab
                    eventKey="timeline"
                    title={<><i className="bi bi-diagram-3 me-1"></i>Timeline</>}
                  >
                    <div style={{ overflowY: 'auto', maxHeight: '45vh' }}>
                      <style>{`
                        @keyframes claimTimelinePulse {
                          0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.38); }
                          60%  { box-shadow: 0 0 0 11px rgba(124,58,237,0); }
                          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
                        }
                      `}</style>

                      {/* Current status banner */}
                      <div
                        className="rounded-3 p-3 mb-4 d-flex align-items-center gap-3"
                        style={{ background: 'linear-gradient(135deg,#f0f4ff,#faf5ff)', border: '1px solid #e0d7f5' }}
                      >
                        <div style={{
                          background: 'linear-gradient(135deg,#667eea,#764ba2)',
                          borderRadius: 10, padding: '8px 10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <i className="bi bi-shield-half text-white" style={{ fontSize: 20 }}></i>
                        </div>
                        <div>
                          <div className="fw-semibold" style={{ fontSize: '0.85rem', color: '#1f2937' }}>
                            Current Status:{' '}
                            <Badge
                              bg={statusVariant(claim.status)}
                              className="px-2 py-1 ms-1"
                              style={{ fontSize: '0.72rem' }}
                            >
                              {statusLabel(claim.status)}
                            </Badge>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                            Claim CLM-{claim.claimID} · Submitted {formatDate(claim.submittedAt)}
                          </div>
                        </div>
                      </div>

                      {/* Vertical timeline */}
                      <div style={{ padding: '0 4px 8px' }}>
                        {TIMELINE_STAGES.map((stage, idx) => {
                          const state      = getStageState(stage.key, claim.status);
                          const isLast     = idx === TIMELINE_STAGES.length - 1;
                          const isRejected = stage.key === 'decision' && claim.status === 'Rejected';
                          const isApproved = stage.key === 'decision' && ['Approved', 'Paid'].includes(claim.status);

                          const dotColor = state === 'pending'
                            ? '#d1d5db'
                            : state === 'active'
                              ? stage.activeColor
                              : isRejected ? '#dc2626' : isApproved ? '#16a34a' : stage.activeColor;

                          const stageLabel = stage.key === 'decision'
                            ? (isApproved
                                ? (claim.status === 'Paid' ? 'Approved & Payment Executed' : 'Claim Approved')
                                : isRejected ? 'Claim Rejected' : stage.label)
                            : stage.label;

                          const stageDesc = stage.key === 'decision'
                            ? (isApproved
                                ? (claim.status === 'Paid'
                                    ? 'Your claim was approved and payment has been executed to your provider.'
                                    : 'Your claim has been approved. Payment will be processed shortly.')
                                : isRejected
                                  ? 'After thorough review, your claim could not be approved. Contact your insurance provider for more information.'
                                  : stage.description)
                            : stage.description;

                          const timestamp = stage.key === 'submitted'
                            ? formatDate(claim.submittedAt)
                            : stage.key === 'decision' && state === 'done' && claim.adjudication?.executedAt
                              ? formatDate(claim.adjudication.executedAt)
                              : null;

                          return (
                            <div key={stage.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                              {/* Left: circle + connector */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 44 }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                  background: state === 'pending' ? '#f9fafb' : dotColor,
                                  border: `2.5px solid ${dotColor}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.3s',
                                  ...(state === 'active'
                                    ? { animation: 'claimTimelinePulse 1.8s ease-in-out infinite' }
                                    : {}),
                                }}>
                                  {state === 'done' ? (
                                    <i className="bi bi-check-lg" style={{ fontSize: 18, color: 'white' }}></i>
                                  ) : state === 'active' ? (
                                    <i className={`bi ${stage.icon}`} style={{ fontSize: 16, color: 'white' }}></i>
                                  ) : (
                                    <i className={`bi ${stage.icon}`} style={{ fontSize: 15, color: '#d1d5db' }}></i>
                                  )}
                                </div>
                                {!isLast && (
                                  <div style={{
                                    width: 3, height: 44,
                                    background: state === 'done' ? dotColor : '#e5e7eb',
                                    margin: '3px 0', borderRadius: 2, flexShrink: 0,
                                  }} />
                                )}
                              </div>

                              {/* Right: content */}
                              <div style={{ paddingTop: 10, flex: 1, paddingBottom: isLast ? 4 : 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                                  <span style={{
                                    fontWeight: 600, fontSize: '0.88rem',
                                    color: state === 'pending' ? '#9ca3af' : '#1f2937',
                                  }}>
                                    {stageLabel}
                                  </span>
                                  {state === 'done' && (
                                    <span style={{
                                      fontSize: '0.65rem', fontWeight: 700,
                                      background: isRejected ? '#fee2e2' : '#d1fae5',
                                      color: isRejected ? '#b91c1c' : '#065f46',
                                      padding: '2px 7px', borderRadius: 999,
                                    }}>
                                      {isRejected ? 'REJECTED' : 'COMPLETED'}
                                    </span>
                                  )}
                                  {state === 'active' && (
                                    <span style={{
                                      fontSize: '0.65rem', fontWeight: 700,
                                      background: dotColor + '22',
                                      color: dotColor,
                                      padding: '2px 7px', borderRadius: 999,
                                      border: `1px solid ${dotColor}55`,
                                    }}>
                                      IN PROGRESS
                                    </span>
                                  )}
                                  {timestamp && (
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 'auto' }}>
                                      <i className="bi bi-clock me-1"></i>{timestamp}
                                    </span>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: '0.78rem',
                                  color: state === 'pending' ? '#d1d5db' : '#6b7280',
                                  lineHeight: 1.55,
                                  paddingBottom: isLast ? 0 : 28,
                                }}>
                                  {stageDesc}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Footer note */}
                      <div
                        className="rounded-3 p-2 d-flex align-items-center gap-2 mt-2"
                        style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                      >
                        <i className="bi bi-info-circle text-muted flex-shrink-0" style={{ fontSize: '0.8rem' }}></i>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          For questions about your claim status, contact your insurance provider or member support.
                        </span>
                      </div>
                    </div>
                  </Tab>
                )}

              </Tabs>
              </div>{/* /cdm-tabs */}
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">

          {/* ── Manual Decision button — UnderReview claims only ────────────
              Shown to Staff/Admin when the claim is in UnderReview status.
              Opens ManualAdjudicationModal in the parent (Claims.jsx).       */}
          {(isAdmin || isStaff) && claim?.status === 'UnderReview' && (
            <Button
              variant="success"
              className="rounded-pill px-4 fw-semibold"
              onClick={() => onManualAdjudicate?.(claim)}
              style={{ marginRight: 'auto' }}
            >
              <i className="bi bi-clipboard2-check-fill me-2"></i>
              Make Decision
            </Button>
          )}

          {/* Reject Claim button — Staff/Admin on non-finalized claims (frontend/claim) */}
          {(isAdmin || isStaff) && claim && !claimFinalized && (
            <Button
              variant="outline-danger"
              className="rounded-pill px-4 me-auto"
              onClick={() => setShowRejectModal(true)}
            >
              <i className="bi bi-x-octagon me-2"></i>Reject Claim
            </Button>
          )}
          <Button variant="light" className="rounded-pill px-4" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Claim confirmation modal (frontend/claim) */}
      <RejectClaimModal
        show={showRejectModal}
        claim={claim}
        onHide={() => setShowRejectModal(false)}
        onRejected={(message) => {
          setShowRejectModal(false);
          if (onRejectClaim && claim?.claimID) {
            onRejectClaim(claim.claimID, message);
          }
        }}
      />
    </>
  );
}