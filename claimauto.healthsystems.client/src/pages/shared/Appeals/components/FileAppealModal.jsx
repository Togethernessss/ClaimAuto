import { useState, useRef } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { fileAppeal } from '../../../../services/appeals/appealService';

// ── Max file size per file: 10 MB ──
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Allowed extensions (UI hint only — backend accepts anything) ──
const ALLOWED_EXTS = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.doc,.docx,.txt';

export default function FileAppealModal({ show, onHide, onFiled }) {
    const [claimId, setClaimId] = useState('');
    const [reason, setReason] = useState('');
    const [files, setFiles] = useState([]);          // Array<File>
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    function reset() {
        setClaimId('');
        setReason('');
        setFiles([]);
        setLoading(false);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleClose() {
        if (loading) return;
        reset();
        onHide();
    }

    // ── File picker handler ──
    function handleFileChange(e) {
        const picked = Array.from(e.target.files || []);
        const validFiles = [];
        const errors = [];

        for (const f of picked) {
            if (f.size > MAX_FILE_SIZE) {
                errors.push(`"${f.name}" is too large (max ${MAX_FILE_SIZE_MB} MB)`);
                continue;
            }
            if (f.size === 0) {
                errors.push(`"${f.name}" is empty`);
                continue;
            }
            validFiles.push(f);
        }

        if (errors.length > 0) {
            setError(errors.join('. '));
        } else {
            setError('');
        }

        // Append new files to existing list (don't replace)
        setFiles((prev) => [...prev, ...validFiles]);

        // Reset the input so user can pick the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function removeFile(index) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function fmtSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function fileIcon(name) {
        const ext = (name || '').toLowerCase().split('.').pop();
        if (ext === 'pdf') return { icon: 'bi-file-earmark-pdf-fill', color: '#dc3545' };
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext))
            return { icon: 'bi-file-earmark-image-fill', color: '#0d6efd' };
        if (['doc', 'docx'].includes(ext))
            return { icon: 'bi-file-earmark-word-fill', color: '#2b579a' };
        return { icon: 'bi-file-earmark-fill', color: '#6c757d' };
    }

    // ── Submit ──
    async function handleSubmit() {
        // Client-side validation
        if (!claimId || isNaN(Number(claimId))) {
            setError('Please enter a valid Claim ID.');
            return;
        }
        if (!reason.trim()) {
            setError('Please enter a reason for the appeal.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const dto = {
                claimID: Number(claimId),
                reason: reason.trim(),
                files: files,   // can be empty array — backend treats as optional
            };

            await fileAppeal(dto);

            onFiled(`Appeal filed successfully for Claim CLM-${claimId}. Staff has been notified.`);
            handleClose();
        } catch (err) {
            // Extract the best error message from the backend response
            let msg = 'Failed to file appeal. Please try again.';

            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    msg = data;
                } else if (data.message) {
                    msg = data.message;
                } else if (data.errors) {
                    // ASP.NET model validation errors
                    const firstField = Object.keys(data.errors)[0];
                    if (firstField && data.errors[firstField]?.[0]) {
                        msg = `${firstField}: ${data.errors[firstField][0]}`;
                    }
                } else if (data.title) {
                    msg = data.title;
                }
            } else if (err.message) {
                msg = err.message;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
            <Modal.Header
                closeButton={!loading}
                style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}
            >
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-file-earmark-plus me-2" style={{ color: '#667eea' }}></i>
                    File an Appeal
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && (
                    <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {error}
                    </Alert>
                )}

                <Alert variant="info" className="py-2 small">
                    <i className="bi bi-info-circle me-1"></i>
                    You can only appeal claims with <strong>Rejected</strong> or <strong>Adjudicated</strong> status.
                </Alert>

                {/* ─── Claim ID ─── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Claim ID <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Enter Claim ID (e.g. 9)"
                        value={claimId}
                        onChange={(e) => setClaimId(e.target.value)}
                        disabled={loading}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                {/* ─── Reason ─── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Reason for Appeal <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Explain why you are contesting this decision..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                {/* ─── File Upload ─── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Supporting Documents
                        {files.length > 0 && (
                            <Badge bg="secondary" pill className="ms-2">{files.length}</Badge>
                        )}
                    </Form.Label>

                    {/* Hidden native file input */}
                    <input
                        type="file"
                        multiple
                        accept={ALLOWED_EXTS}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        disabled={loading}
                        style={{ display: 'none' }}
                    />

                    {/* Custom Browse button */}
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            style={{ borderRadius: '10px' }}
                        >
                            <i className="bi bi-paperclip me-1"></i>
                            Browse Files
                        </Button>
                        <span className="text-muted small">
                            Max {MAX_FILE_SIZE_MB} MB per file. PDF, images, Word docs accepted.
                        </span>
                    </div>

                    {/* Selected files list */}
                    {files.length > 0 && (
                        <div className="border rounded mt-2">
                            {files.map((f, idx) => {
                                const { icon, color } = fileIcon(f.name);
                                return (
                                    <div
                                        key={idx}
                                        className="d-flex align-items-center justify-content-between p-2"
                                        style={{
                                            borderBottom: idx < files.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        }}
                                    >
                                        <div className="d-flex align-items-center flex-grow-1"
                                            style={{ minWidth: 0 }}>
                                            <i className={`bi ${icon} me-2`}
                                                style={{ fontSize: '1.3rem', color }}></i>
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="small text-truncate fw-semibold"
                                                    title={f.name}>
                                                    {f.name}
                                                </div>
                                                <div className="text-muted"
                                                    style={{ fontSize: '0.7rem' }}>
                                                    {fmtSize(f.size)}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => removeFile(idx)}
                                            disabled={loading}
                                            className="text-danger p-0 ms-2"
                                            title="Remove this file"
                                        >
                                            <i className="bi bi-x-circle-fill"
                                                style={{ fontSize: '1.2rem' }}></i>
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <Form.Text className="text-muted">
                        Attach evidence: medical records, receipts, letters, etc.
                    </Form.Text>
                </Form.Group>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button
                    variant="outline-secondary"
                    onClick={handleClose}
                    disabled={loading}
                    style={{ borderRadius: '10px' }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !claimId.trim() || !reason.trim()}
                    style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none',
                        borderRadius: '10px',
                    }}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Filing…
                        </>
                    ) : (
                        <>
                            <i className="bi bi-file-earmark-plus me-1"></i>
                            File Appeal
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}