import { useState, useEffect } from 'react';
import { Modal, Button, Badge, Spinner } from 'react-bootstrap';
import {
    formatDateTime, statusStyle, statusIcon,
    outcomeStyle, outcomeIcon, outcomeLabel,
} from '../utils/appealHelpers';
import {
    downloadAppealPdf,
    getAppealDocuments,
    viewAppealDocument,
    downloadAppealDocument,
} from '../../../../services/appeals/appealService';

export default function AppealDetailModal({ show, onHide, appeal }) {
    if (!appeal) return null;

    const sStyle = statusStyle(appeal.status);

    let documents = [];
    if (appeal.documentsJSON) {
        try { documents = JSON.parse(appeal.documentsJSON); } catch { documents = []; }
    }

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-megaphone me-2" style={{ color: '#667eea' }}></i>
                    Appeal APL-{appeal.appealID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                        <div className="text-muted small">Claim ID</div>
                        <div className="fw-semibold">CLM-{appeal.claimID}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Status</div>
                        <Badge pill style={{ background: sStyle.bg, color: sStyle.color }}>
                            <i className={`bi ${statusIcon(appeal.status)} me-1`}></i>
                            {appeal.status === 'UnderReview' ? 'Under Review' : appeal.status}
                        </Badge>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Filed By</div>
                        <div>{appeal.filedByName || '—'}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Filed At</div>
                        <div>{formatDateTime(appeal.filedAt)}</div>
                    </div>

                    {appeal.outcome && (
                        <>
                            <div className="col-sm-6">
                                <div className="text-muted small">Outcome</div>
                                <Badge pill style={{ ...outcomeStyle(appeal.outcome), fontSize: '0.85rem', padding: '5px 12px' }}>
                                    <i className={`bi ${outcomeIcon(appeal.outcome)} me-1`}></i>
                                    {outcomeLabel(appeal.outcome)}
                                </Badge>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Decided By</div>
                                <div>{appeal.decisionByName || '—'}</div>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Decided At</div>
                                <div>{formatDateTime(appeal.decisionAt)}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Reason */}
                <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa' }}>
                    <h6 className="fw-semibold small mb-1">
                        <i className="bi bi-chat-left-text me-1"></i>Reason for Appeal
                    </h6>
                    <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                        {appeal.reason}
                    </p>
                </div>

                {/* Documents list — with View + Download per file */}
                <AppealDocumentsSection appealId={appeal.appealID} fallbackNames={documents} />
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                {appeal.hasPDF && (
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => downloadAppealPdf(appeal.appealID)}
                        style={{ borderRadius: '10px', marginRight: 'auto' }}
                    >
                        <i className="bi bi-file-earmark-pdf me-1"></i>Download Documents PDF
                    </Button>
                )}
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppealDocumentsSection — fetches AppealDocument metadata and renders each
// row with View (opens in new tab) + Download buttons. Backend already enforces
// access control: only the filer or staff/admin in the same org get the bytes.
// `fallbackNames` is the legacy DocumentsJSON list, used only if the metadata
// fetch fails (e.g., very old appeal with no AppealDocument rows).
// ─────────────────────────────────────────────────────────────────────────────
function AppealDocumentsSection({ appealId, fallbackNames }) {
    const [docs,    setDocs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [opening, setOpening] = useState(null);   // docId currently being viewed/downloaded

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getAppealDocuments(appealId)
            .then(data => { if (!cancelled) setDocs(data || []); })
            .catch(()   => { if (!cancelled) setError('Could not load documents.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [appealId]);

    function fmtSize(bytes) {
        if (!bytes || bytes <= 0) return '';
        if (bytes < 1024)            return `${bytes} B`;
        if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function iconFor(contentType, fileName) {
        const ct = (contentType || '').toLowerCase();
        const fn = (fileName || '').toLowerCase();
        if (ct.includes('pdf')   || fn.endsWith('.pdf'))                          return 'bi-file-earmark-pdf text-danger';
        if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(fn))         return 'bi-file-earmark-image text-primary';
        if (ct.includes('word')  || fn.endsWith('.docx') || fn.endsWith('.doc'))   return 'bi-file-earmark-word text-primary';
        return 'bi-file-earmark text-muted';
    }

    async function handleView(d) {
        setOpening(d.documentID);
        try { await viewAppealDocument(appealId, d.documentID); }
        catch { setError(`Failed to open "${d.fileName}".`); }
        finally { setOpening(null); }
    }

    async function handleDownload(d) {
        setOpening(d.documentID);
        try { await downloadAppealDocument(appealId, d.documentID, d.fileName); }
        catch { setError(`Failed to download "${d.fileName}".`); }
        finally { setOpening(null); }
    }

    // Hide section entirely if no docs known and metadata fetch returned empty
    if (!loading && docs.length === 0 && (!fallbackNames || fallbackNames.length === 0)) {
        return null;
    }

    return (
        <div className="mb-3">
            <h6 className="fw-semibold small mb-2">
                <i className="bi bi-paperclip me-1"></i>
                Attached Documents ({docs.length || (fallbackNames || []).length})
            </h6>

            {loading && (
                <div className="small text-muted">
                    <Spinner animation="border" size="sm" className="me-2" />Loading documents…
                </div>
            )}

            {error && (
                <div className="small text-danger mb-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>{error}
                </div>
            )}

            {!loading && docs.map((d) => (
                <div
                    key={d.documentID}
                    className="d-flex align-items-center gap-2 p-2 mb-1 rounded"
                    style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                >
                    <i className={`bi ${iconFor(d.contentType, d.fileName)}`} style={{ fontSize: 18 }}></i>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="small fw-semibold text-truncate" title={d.fileName}>
                            {d.fileName}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                            {fmtSize(d.fileSize)}{d.contentType ? ` · ${d.contentType}` : ''}
                        </div>
                    </div>
                    <Button
                        size="sm" variant="outline-primary"
                        disabled={opening === d.documentID}
                        onClick={() => handleView(d)}
                        style={{ borderRadius: 6, fontSize: 11 }}
                        title="Open in new tab"
                    >
                        {opening === d.documentID
                            ? <Spinner animation="border" size="sm" />
                            : <><i className="bi bi-eye me-1"></i>View</>}
                    </Button>
                    <Button
                        size="sm" variant="outline-secondary"
                        disabled={opening === d.documentID}
                        onClick={() => handleDownload(d)}
                        style={{ borderRadius: 6, fontSize: 11 }}
                        title="Download original file"
                    >
                        <i className="bi bi-download"></i>
                    </Button>
                </div>
            ))}

            {/* Fallback: if metadata fetch failed but DocumentsJSON has names, at least show them */}
            {!loading && error && docs.length === 0 && fallbackNames && fallbackNames.length > 0 && (
                <>
                    {fallbackNames.map((name, i) => (
                        <div key={i} className="small text-muted mb-1">
                            <i className="bi bi-file-earmark text-primary me-1"></i>{name}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}