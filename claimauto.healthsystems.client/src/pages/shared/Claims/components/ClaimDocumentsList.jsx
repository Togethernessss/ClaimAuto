import { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import {
    getClaimDocuments,
    viewClaimDocument,
    downloadClaimDocument,
    verifyDocument,
    deleteDocument,
} from '../../../../services/claims/claimService';
import UploadDocumentModal from './UploadDocumentModal';

/**
 * ClaimDocumentsList
 * ─────────────────────────────────────────────────────────────────────
 * Self-contained card that shows every document attached to a claim
 * with per-document actions:
 *   • View       — opens file inline in a new tab (all roles)
 *   • Download   — saves file with original name (all roles)
 *   • Verify     — Admin / InsuranceStaff only, on Pending docs
 *   • Reject     — Admin / InsuranceStaff only, on Pending docs
 *   • Delete     — uploader only, while doc is Pending and claim is open
 *   • + Upload   — Hospital / Policyholder while claim allows
 *
 * Props:
 *   claimId      : number    — claim to load docs for
 *   claimStatus  : string    — current claim status (controls upload visibility)
 *   currentUser  : object    — { userID, role } for permission checks
 *   onChange     : () => void (optional) — fired after any action so parent can refresh
 */
export default function ClaimDocumentsList({ claimId, claimStatus, currentUser, onChange }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);   // e.g. "view-12"
    const [showUpload, setShowUpload] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // ─── Role helpers ─────────────────────────────────────────────────
    const role = currentUser?.role;
    const userId = currentUser?.userID;
    const isStaff = role === 'Admin' || role === 'InsuranceStaff';
    const canUpload =
        (role === 'Hospital' || role === 'Policyholder' || isStaff)
        && (claimStatus === 'Submitted' || claimStatus === 'DocsVerificationPending');

    // ─── Load docs on mount + whenever claimId changes ────────────────
    useEffect(() => {
        if (claimId) loadDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claimId]);

    async function loadDocuments() {
        setLoading(true);
        setError('');
        try {
            const data = await getClaimDocuments(claimId);
            setDocuments(data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load documents.');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }

    // ─── File icon picker ────────────────────────────────────────────
    function fileIcon(fileName, contentType) {
        const ext = (fileName || '').toLowerCase().split('.').pop();
        const ct = (contentType || '').toLowerCase();

        if (ext === 'pdf' || ct.includes('pdf'))
            return { icon: 'bi-file-earmark-pdf-fill', color: '#dc3545' };
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext) || ct.startsWith('image/'))
            return { icon: 'bi-file-earmark-image-fill', color: '#0d6efd' };
        if (['doc', 'docx'].includes(ext) || ct.includes('word'))
            return { icon: 'bi-file-earmark-word-fill', color: '#2b579a' };
        if (['xls', 'xlsx'].includes(ext) || ct.includes('excel'))
            return { icon: 'bi-file-earmark-excel-fill', color: '#217346' };
        return { icon: 'bi-file-earmark-fill', color: '#6c757d' };
    }

    // ─── Status badge styling ────────────────────────────────────────
    function statusBadge(status) {
        const map = {
            Pending: { bg: '#f39c12', label: 'Pending Review' },
            Verified: { bg: '#27ae60', label: 'Verified' },
            Rejected: { bg: '#e74c3c', label: 'Rejected' },
        };
        const s = map[status] || { bg: '#95a5a6', label: status };
        return (
            <Badge pill style={{ background: s.bg, color: '#fff', fontSize: '0.7rem' }}>
                {s.label}
            </Badge>
        );
    }

    function fmtDateTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    function fmtSize(bytes) {
        if (bytes == null) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // ─── Action handlers ─────────────────────────────────────────────
    async function handleView(doc) {
        setActionLoading(`view-${doc.docID}`);
        try {
            await viewClaimDocument(claimId, doc.docID);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open document.');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDownload(doc) {
        setActionLoading(`dl-${doc.docID}`);
        try {
            await downloadClaimDocument(claimId, doc.docID, doc.fileName);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to download document.');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleVerify(doc) {
        setActionLoading(`verify-${doc.docID}`);
        setError('');
        try {
            await verifyDocument(claimId, doc.docID, 'Verified');
            setSuccessMsg(`Document "${doc.fileName || `#${doc.docID}`}" marked as Verified.`);
            await loadDocuments();
            onChange?.();
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify document.');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(doc) {
        const ok = window.confirm(
            `Reject document "${doc.fileName || `#${doc.docID}`}"?\n\n` +
            `⚠️ IMPORTANT: If you proceed to adjudication afterwards, ` +
            `the entire claim will be REJECTED because it has a rejected supporting document.`
        );
        if (!ok) return;

        setActionLoading(`reject-${doc.docID}`);
        setError('');
        try {
            await verifyDocument(claimId, doc.docID, 'Rejected');
            setSuccessMsg(`Document "${doc.fileName || `#${doc.docID}`}" marked as Rejected.`);
            await loadDocuments();
            onChange?.();
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject document.');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDelete(doc) {
        const ok = window.confirm(`Delete document "${doc.fileName || `#${doc.docID}`}"? This cannot be undone.`);
        if (!ok) return;

        setActionLoading(`del-${doc.docID}`);
        setError('');
        try {
            await deleteDocument(claimId, doc.docID);
            setSuccessMsg('Document deleted.');
            await loadDocuments();
            onChange?.();
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete document.');
        } finally {
            setActionLoading(null);
        }
    }

    function handleUploaded(msg) {
        setSuccessMsg(msg);
        loadDocuments();
        onChange?.();
        setTimeout(() => setSuccessMsg(''), 5000);
    }

    // ─── Per-row permission checks ───────────────────────────────────
    function canDeleteRow(doc) {
        if (doc.status === 'Verified') return false;          // verified = sealed
        if (claimStatus === 'Approved' || claimStatus === 'Rejected' || claimStatus === 'Paid')
            return false;                                       // finalized claims locked
        if (isStaff) return true;                              // staff/admin can delete pending
        return doc.uploadedByID === userId;                    // others: only own uploads
    }

    function canVerifyRow(doc) {
        return isStaff && doc.status === 'Pending';
    }


    // ═════════════════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════════════════

    return (
        <>
            <Card className="shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
                {/* ─── Header ─── */}
                <Card.Header
                    className="d-flex align-items-center justify-content-between"
                    style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef', borderRadius: '12px 12px 0 0' }}
                >
                    <div className="d-flex align-items-center">
                        <i className="bi bi-paperclip me-2" style={{ color: '#667eea', fontSize: '1.2rem' }}></i>
                        <span className="fw-bold">Supporting Documents</span>
                        {documents.length > 0 && (
                            <Badge bg="secondary" pill className="ms-2">{documents.length}</Badge>
                        )}
                    </div>

                    {canUpload && (
                        <Button
                            size="sm"
                            onClick={() => setShowUpload(true)}
                            style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                border: 'none',
                                borderRadius: '8px',
                            }}
                        >
                            <i className="bi bi-cloud-arrow-up me-1"></i>
                            Upload Document
                        </Button>
                    )}
                </Card.Header>

                {/* ─── Body ─── */}
                <Card.Body style={{ padding: '12px 16px' }}>
                    {successMsg && (
                        <Alert variant="success" className="py-2 small mb-3" onClose={() => setSuccessMsg('')} dismissible>
                            <i className="bi bi-check-circle me-1"></i>{successMsg}
                        </Alert>
                    )}
                    {error && (
                        <Alert variant="danger" className="py-2 small mb-3" onClose={() => setError('')} dismissible>
                            <i className="bi bi-exclamation-triangle me-1"></i>{error}
                        </Alert>
                    )}

                    {/* ─── Loading ─── */}
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" size="sm" style={{ color: '#667eea' }} />
                            <span className="ms-2 text-muted small">Loading documents…</span>
                        </div>
                    ) : documents.length === 0 ? (
                        /* ─── Empty state ─── */
                        <div className="text-center py-4 text-muted">
                            <i className="bi bi-folder-x" style={{ fontSize: '2rem', color: '#cbd5e0' }}></i>
                            <div className="mt-2 small">
                                No documents attached yet.
                                {canUpload && ' Click "Upload Document" above to add one.'}
                            </div>
                        </div>
                    ) : (
                        /* ─── Document rows ─── */
                        <div>
                            {documents.map((doc, idx) => {
                                const ico = fileIcon(doc.fileName, doc.contentType);
                                const isLoadingView = actionLoading === `view-${doc.docID}`;
                                const isLoadingDl = actionLoading === `dl-${doc.docID}`;
                                const isLoadingVerify = actionLoading === `verify-${doc.docID}`;
                                const isLoadingReject = actionLoading === `reject-${doc.docID}`;
                                const isLoadingDel = actionLoading === `del-${doc.docID}`;

                                return (
                                    <div
                                        key={doc.docID}
                                        className="d-flex align-items-center justify-content-between p-2 gap-2"
                                        style={{
                                            borderBottom: idx < documents.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        }}
                                    >
                                        {/* ─── File icon + name + meta ─── */}
                                        <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
                                            <i className={`bi ${ico.icon} me-2`}
                                                style={{ fontSize: '1.6rem', color: ico.color }}></i>

                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="fw-semibold small text-truncate"
                                                        title={doc.fileName}
                                                        style={{ maxWidth: '300px' }}>
                                                        {doc.fileName || `Document #${doc.docID}`}
                                                    </span>
                                                    {statusBadge(doc.status)}
                                                    <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>
                                                        {doc.docType}
                                                    </Badge>
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                    {doc.fileSizeDisplay || fmtSize(doc.fileSize)}
                                                    {' • '}
                                                    Uploaded by {doc.uploadedByName} on {fmtDateTime(doc.uploadedAt)}
                                                    {doc.verifiedByName && (
                                                        <span className="ms-2">
                                                            • {doc.status === 'Rejected' ? 'Rejected' : 'Verified'} by {doc.verifiedByName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─── Action buttons ─── */}
                                        <div className="d-flex gap-1 flex-shrink-0">
                                            {/* View */}
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleView(doc)}
                                                disabled={isLoadingView}
                                                title="View document inline"
                                                style={{ borderRadius: '6px' }}
                                            >
                                                {isLoadingView
                                                    ? <Spinner animation="border" size="sm" />
                                                    : <><i className="bi bi-eye"></i>
                                                        <span className="d-none d-md-inline ms-1">View</span></>}
                                            </Button>

                                            {/* Download */}
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => handleDownload(doc)}
                                                disabled={isLoadingDl}
                                                title="Download with original filename"
                                                style={{ borderRadius: '6px' }}
                                            >
                                                {isLoadingDl
                                                    ? <Spinner animation="border" size="sm" />
                                                    : <><i className="bi bi-download"></i>
                                                        <span className="d-none d-md-inline ms-1">Download</span></>}
                                            </Button>

                                            {/* Verify — staff only, on Pending */}
                                            {canVerifyRow(doc) && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleVerify(doc)}
                                                    disabled={isLoadingVerify}
                                                    title="Mark as Verified"
                                                    style={{ borderRadius: '6px' }}
                                                >
                                                    {isLoadingVerify
                                                        ? <Spinner animation="border" size="sm" />
                                                        : <><i className="bi bi-check-circle"></i>
                                                            <span className="d-none d-lg-inline ms-1">Verify</span></>}
                                                </Button>
                                            )}

                                            {/* Reject — staff only, on Pending */}
                                            {canVerifyRow(doc) && (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleReject(doc)}
                                                    disabled={isLoadingReject}
                                                    title="Mark as Rejected (will deny claim on adjudication)"
                                                    style={{ borderRadius: '6px' }}
                                                >
                                                    {isLoadingReject
                                                        ? <Spinner animation="border" size="sm" />
                                                        : <><i className="bi bi-x-circle"></i>
                                                            <span className="d-none d-lg-inline ms-1">Reject</span></>}
                                                </Button>
                                            )}

                                            {/* Delete — uploader or staff, on non-Verified, while claim is open */}
                                            {canDeleteRow(doc) && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => handleDelete(doc)}
                                                    disabled={isLoadingDel}
                                                    title="Delete this document"
                                                    className="text-danger p-1"
                                                >
                                                    {isLoadingDel
                                                        ? <Spinner animation="border" size="sm" />
                                                        : <i className="bi bi-trash" style={{ fontSize: '1rem' }}></i>}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ─── Warning if any documents are rejected (staff only) ─── */}
                    {isStaff && documents.some(d => d.status === 'Rejected') && (
                        <Alert variant="warning" className="py-2 small mt-3 mb-0">
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            <strong>Warning:</strong> This claim has rejected supporting documents.
                            Proceeding to adjudication will automatically <strong>deny</strong> the claim.
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* ─── Upload modal ─── */}
            <UploadDocumentModal
                show={showUpload}
                onHide={() => setShowUpload(false)}
                claimId={claimId}
                onUploaded={handleUploaded}
            />
        </>
    );
}