import { useState, useEffect } from 'react';
import { Modal, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import {
    getAppealDocuments,
    viewAppealDocument,
    downloadAppealDocument,
    viewAppealPdf,
    downloadAppealPdf,
} from '../../../../services/appeals/appealService';
import { statusStyle, outcomeStyle, formatDateTime } from '../utils/appealHelpers';

export default function AppealDetailModal({ show, onHide, appeal, onWithdraw, onDecide }) {
    // ── Document list state ──
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docActionLoading, setDocActionLoading] = useState(null);

    // ── Compiled PDF state ──
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState('');

    // ── Load documents when modal opens for a new appeal ──
    useEffect(() => {
        if (show && appeal?.appealID) {
            loadDocuments(appeal.appealID);
        } else {
            setDocuments([]);
            setPdfError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, appeal?.appealID]);

    async function loadDocuments(appealId) {
        setDocsLoading(true);
        try {
            const docs = await getAppealDocuments(appealId);
            setDocuments(docs || []);
        } catch {
            setDocuments([]);
        } finally {
            setDocsLoading(false);
        }
    }

    if (!appeal) return null;

    // ── File-type icon picker ──
    function fileIcon(fileName, contentType) {
        const ext = (fileName || '').toLowerCase().split('.').pop();
        const ct = (contentType || '').toLowerCase();

        if (ext === 'pdf' || ct.includes('pdf'))
            return { name: 'bi-file-earmark-pdf-fill', color: '#dc3545' };
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext) || ct.startsWith('image/'))
            return { name: 'bi-file-earmark-image-fill', color: '#0d6efd' };
        if (['doc', 'docx'].includes(ext) || ct.includes('word'))
            return { name: 'bi-file-earmark-word-fill', color: '#2b579a' };
        if (['xls', 'xlsx'].includes(ext) || ct.includes('excel') || ct.includes('spreadsheet'))
            return { name: 'bi-file-earmark-excel-fill', color: '#217346' };
        if (ext === 'txt' || ct.startsWith('text/'))
            return { name: 'bi-file-earmark-text-fill', color: '#6c757d' };

        return { name: 'bi-file-earmark-fill', color: '#6c757d' };
    }

    // ── Document action handlers ──
    async function handleViewDoc(doc) {
        setDocActionLoading(`view-${doc.documentID}`);
        try {
            await viewAppealDocument(appeal.appealID, doc.documentID);
        } catch {
            alert('Failed to open document.');
        } finally {
            setDocActionLoading(null);
        }
    }

    async function handleDownloadDoc(doc) {
        setDocActionLoading(`dl-${doc.documentID}`);
        try {
            await downloadAppealDocument(appeal.appealID, doc.documentID, doc.fileName);
        } catch {
            alert('Failed to download document.');
        } finally {
            setDocActionLoading(null);
        }
    }

    // ── Compiled PDF handlers ──
    async function handleViewCompiledPdf() {
        setPdfLoading(true); setPdfError('');
        try {
            await viewAppealPdf(appeal.appealID);
        } catch (err) {
            setPdfError(err.response?.status === 404 ? 'No compiled PDF available.' : 'Failed to open PDF.');
        } finally {
            setPdfLoading(false);
        }
    }

    async function handleDownloadCompiledPdf() {
        setPdfLoading(true); setPdfError('');
        try {
            await downloadAppealPdf(appeal.appealID);
        } catch (err) {
            setPdfError(err.response?.status === 404 ? 'No compiled PDF available.' : 'Failed to download PDF.');
        } finally {
            setPdfLoading(false);
        }
    }

    const sStyle = statusStyle(appeal.status);

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-megaphone-fill me-2" style={{ color: '#667eea' }}></i>
                    Appeal APL-{appeal.appealID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {pdfError && (
                    <Alert variant="danger" className="py-2 small" onClose={() => setPdfError('')} dismissible>
                        {pdfError}
                    </Alert>
                )}

                {/* ─── Top info grid ─── */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <div className="text-muted small">Claim ID</div>
                        <div className="fw-bold">CLM-{appeal.claimID}</div>
                    </div>
                    <div className="col-md-6">
                        <div className="text-muted small">Status</div>
                        <Badge pill style={{
                            background: sStyle.bg,
                            color: sStyle.color,
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem',
                        }}>
                            {appeal.status === 'Withdrawn' && <i className="bi bi-x-circle-fill me-1"></i>}
                            {appeal.status === 'Decided' && <i className="bi bi-check-circle-fill me-1"></i>}
                            {appeal.status === 'Filed' && <i className="bi bi-file-earmark-plus me-1"></i>}
                            {appeal.status === 'UnderReview' && <i className="bi bi-hourglass-split me-1"></i>}
                            {appeal.status}
                        </Badge>
                    </div>
                    <div className="col-md-6">
                        <div className="text-muted small">Filed By</div>
                        <div>{appeal.filedByName || '—'}</div>
                    </div>
                    <div className="col-md-6">
                        <div className="text-muted small">Filed At</div>
                        <div>{formatDateTime(appeal.filedAt)}</div>
                    </div>
                </div>

                {/* ─── Reason ─── */}
                <div className="mb-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
                    <div className="fw-semibold mb-1">
                        <i className="bi bi-chat-left-text me-2"></i>
                        Reason for Appeal
                    </div>
                    <div>{appeal.reason || '—'}</div>
                </div>

                {/* ─── Attached Documents (each with View + Download) ─── */}
                <div className="mb-3">
                    <div className="fw-semibold mb-2 d-flex align-items-center">
                        <i className="bi bi-paperclip me-2"></i>
                        Attached Documents
                        {documents.length > 0 && (
                            <Badge bg="secondary" pill className="ms-2">{documents.length}</Badge>
                        )}
                    </div>

                    {docsLoading ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" size="sm" style={{ color: '#667eea' }} />
                            <span className="ms-2 small text-muted">Loading…</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-3 rounded border text-muted small text-center"
                            style={{ background: '#f8f9fa', borderStyle: 'dashed' }}>
                            <i className="bi bi-info-circle me-1"></i>
                            No documents were attached to this appeal.
                        </div>
                    ) : (
                        <div className="border rounded">
                            {documents.map((doc, idx) => {
                                const icon = fileIcon(doc.fileName, doc.contentType);
                                const isLoadingView = docActionLoading === `view-${doc.documentID}`;
                                const isLoadingDl = docActionLoading === `dl-${doc.documentID}`;

                                return (
                                    <div
                                        key={doc.documentID}
                                        className="d-flex align-items-center justify-content-between p-2 gap-2"
                                        style={{
                                            borderBottom: idx < documents.length - 1
                                                ? '1px solid #f0f0f0'
                                                : 'none',
                                        }}
                                    >
                                        <div className="d-flex align-items-center flex-grow-1"
                                            style={{ minWidth: 0 }}>
                                            <i className={`bi ${icon.name} me-2`}
                                                style={{ fontSize: '1.4rem', color: icon.color }}></i>
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="small text-truncate fw-semibold"
                                                    title={doc.fileName}>
                                                    {doc.fileName}
                                                </div>
                                                <div className="text-muted"
                                                    style={{ fontSize: '0.7rem' }}>
                                                    {doc.fileSizeDisplay
                                                        || `${(doc.fileSize / 1024).toFixed(1)} KB`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-1">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleViewDoc(doc)}
                                                disabled={isLoadingView}
                                                title="View this file"
                                                style={{ borderRadius: '6px' }}
                                            >
                                                {isLoadingView ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <>
                                                        <i className="bi bi-eye"></i>
                                                        <span className="d-none d-sm-inline ms-1">View</span>
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleDownloadDoc(doc)}
                                                disabled={isLoadingDl}
                                                title="Download this file"
                                                style={{
                                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                {isLoadingDl ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <>
                                                        <i className="bi bi-download"></i>
                                                        <span className="d-none d-sm-inline ms-1">Download</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Decision details (only if decided) ─── */}
                {appeal.status === 'Decided' && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#f0f7ff' }}>
                        <div className="fw-semibold mb-2">
                            <i className="bi bi-gavel me-2"></i>
                            Decision
                        </div>
                        <div className="row g-2">
                            <div className="col-md-4">
                                <div className="text-muted small">Outcome</div>
                                {appeal.outcome ? (
                                    <Badge pill style={{
                                        background: outcomeStyle(appeal.outcome).color,
                                        color: '#fff',
                                    }}>
                                        {appeal.outcome}
                                    </Badge>
                                ) : '—'}
                            </div>
                            <div className="col-md-4">
                                <div className="text-muted small">Decided By</div>
                                <div>{appeal.decisionByName || '—'}</div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-muted small">Decided At</div>
                                <div className="small">{formatDateTime(appeal.decisionAt)}</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                {/* Combined PDF button (only if available) */}
                {appeal.hasPDF && (
                    <Button
                        variant="outline-primary"
                        onClick={handleDownloadCompiledPdf}
                        disabled={pdfLoading}
                        style={{ borderRadius: '10px' }}
                        title="Download all documents combined into one PDF"
                    >
                        {pdfLoading ? (
                            <Spinner animation="border" size="sm" />
                        ) : (
                            <>
                                <i className="bi bi-file-earmark-pdf me-1"></i>
                                Download Documents PDF
                            </>
                        )}
                    </Button>
                )}

                {/* Withdraw — only owner, only if active */}
                {onWithdraw && (appeal.status === 'Filed' || appeal.status === 'UnderReview') && (
                    <Button
                        variant="outline-warning"
                        onClick={() => onWithdraw(appeal.appealID)}
                        style={{ borderRadius: '10px' }}
                    >
                        <i className="bi bi-x-circle me-1"></i>
                        Withdraw
                    </Button>
                )}

                {/* Decide — only staff, only if active */}
                {onDecide && (appeal.status === 'Filed' || appeal.status === 'UnderReview') && (
                    <Button
                        variant="success"
                        onClick={() => onDecide(appeal)}
                        style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            border: 'none',
                            borderRadius: '10px',
                        }}
                    >
                        <i className="bi bi-gavel me-1"></i>
                        Decide
                    </Button>
                )}

                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}