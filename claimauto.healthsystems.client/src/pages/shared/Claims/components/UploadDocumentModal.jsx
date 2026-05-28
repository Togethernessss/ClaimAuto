import { useState, useRef } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { uploadDocument } from '../../../../services/claims/claimService';

// Max file size: 10 MB (matches a sensible production limit)
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// File extensions accepted by the picker (UI hint only)
const ALLOWED_EXTS = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.txt';

// Doc type options — must match backend DocType enum exactly
const DOC_TYPES = [
    { value: 'Invoice', label: 'Invoice / Bill' },
    { value: 'MedicalRecord', label: 'Medical Record' },
    { value: 'LabReport', label: 'Lab Report' },
    { value: 'Prescription', label: 'Prescription' },
    { value: 'DischargeSummary', label: 'Discharge Summary' },
];

/**
 * UploadDocumentModal
 * ─────────────────────────────────────────────────────────────────────
 * Lets Hospital/Policyholder/Admin/Staff attach a supporting document
 * to a claim. Uploads via multipart/form-data so the actual file bytes
 * land in the AppealDocuments table (not just a URI string).
 *
 * Props:
 *   show       : boolean         — controls modal visibility
 *   onHide     : () => void      — close handler
 *   claimId    : number          — the claim to attach to
 *   onUploaded : (msg) => void   — success callback (refresh parent list)
 */
export default function UploadDocumentModal({ show, onHide, claimId, onUploaded }) {
    const [docType, setDocType] = useState('Invoice');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    // ─── Reset state when modal closes ────────────────────────────────
    function reset() {
        setDocType('Invoice');
        setFile(null);
        setLoading(false);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleClose() {
        if (loading) return;
        reset();
        onHide();
    }

    // ─── File picker handler with size validation ─────────────────────
    function handleFileChange(e) {
        const picked = e.target.files?.[0];
        if (!picked) {
            setFile(null);
            return;
        }
        if (picked.size === 0) {
            setError(`"${picked.name}" is empty.`);
            setFile(null);
            return;
        }
        if (picked.size > MAX_FILE_SIZE) {
            setError(`"${picked.name}" is too large (max ${MAX_FILE_SIZE_MB} MB).`);
            setFile(null);
            return;
        }
        setError('');
        setFile(picked);
    }

    // ─── File-type icon helper ────────────────────────────────────────
    function fileIcon(name) {
        const ext = (name || '').toLowerCase().split('.').pop();
        if (ext === 'pdf') return { icon: 'bi-file-earmark-pdf-fill', color: '#dc3545' };
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'bi-file-earmark-image-fill', color: '#0d6efd' };
        if (['doc', 'docx'].includes(ext)) return { icon: 'bi-file-earmark-word-fill', color: '#2b579a' };
        return { icon: 'bi-file-earmark-fill', color: '#6c757d' };
    }

    function fmtSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // ─── Submit ───────────────────────────────────────────────────────
    async function handleSubmit() {
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }
        if (!docType) {
            setError('Please choose a document type.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await uploadDocument(claimId, file, docType);
            onUploaded?.(`Document "${file.name}" uploaded successfully.`);
            handleClose();
        } catch (err) {
            // Extract the actual backend error
            let msg = 'Failed to upload document.';
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') msg = data;
                else if (data.message) msg = data.message;
                else if (data.title) msg = data.title;
                else if (data.errors) {
                    const firstKey = Object.keys(data.errors)[0];
                    if (firstKey && data.errors[firstKey]?.[0])
                        msg = `${firstKey}: ${data.errors[firstKey][0]}`;
                }
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    const ico = file ? fileIcon(file.name) : null;

    return (
        <Modal show={show} onHide={handleClose} centered backdrop="static">
            <Modal.Header
                closeButton={!loading}
                style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}
            >
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-cloud-arrow-up me-2" style={{ color: '#667eea' }}></i>
                    Upload Document
                    <Badge bg="secondary" pill className="ms-2" style={{ fontSize: '0.7rem' }}>
                        CLM-{claimId}
                    </Badge>
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
                    Supported formats: PDF, images, Word docs. Max <strong>{MAX_FILE_SIZE_MB} MB</strong>.
                </Alert>

                {/* ─── Document Type ────────────────────────────────── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Document Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        disabled={loading}
                        style={{ borderRadius: '10px' }}
                    >
                        {DOC_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </Form.Select>
                </Form.Group>

                {/* ─── File Picker ──────────────────────────────────── */}
                <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small">
                        File <span className="text-danger">*</span>
                    </Form.Label>

                    {/* Hidden native input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_EXTS}
                        onChange={handleFileChange}
                        disabled={loading}
                        style={{ display: 'none' }}
                    />

                    {/* Pretty Browse button */}
                    <div className="d-flex align-items-center gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            style={{ borderRadius: '10px' }}
                        >
                            <i className="bi bi-paperclip me-1"></i>
                            {file ? 'Change File' : 'Choose File'}
                        </Button>
                        {!file && (
                            <span className="text-muted small">No file selected</span>
                        )}
                    </div>
                </Form.Group>

                {/* ─── Selected File Preview ────────────────────────── */}
                {file && (
                    <div
                        className="d-flex align-items-center p-2 rounded border mt-2"
                        style={{ background: '#f8f9ff' }}
                    >
                        <i
                            className={`bi ${ico.icon} me-2`}
                            style={{ fontSize: '1.6rem', color: ico.color }}
                        ></i>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="small fw-semibold text-truncate" title={file.name}>
                                {file.name}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {fmtSize(file.size)}
                            </div>
                        </div>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                                setFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            disabled={loading}
                            className="text-danger p-0 ms-2"
                            title="Remove"
                        >
                            <i className="bi bi-x-circle-fill" style={{ fontSize: '1.2rem' }}></i>
                        </Button>
                    </div>
                )}
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
                    disabled={loading || !file}
                    style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none',
                        borderRadius: '10px',
                    }}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Uploading…
                        </>
                    ) : (
                        <>
                            <i className="bi bi-cloud-arrow-up me-1"></i>
                            Upload
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}