import { useState, useRef } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { fileAppeal } from '../../../../services/appeals/appealService';

export default function FileAppealModal({ show, onHide, onFiled }) {
    const [claimId, setClaimId] = useState('');
    const [reason, setReason] = useState('');
    const [files, setFiles] = useState([]);
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
        reset();
        onHide();
    }

    function handleFilesChange(e) {
        const selected = Array.from(e.target.files);
        setFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            const newFiles = selected.filter(f => !existingNames.has(f.name));
            return [...prev, ...newFiles];
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function removeFile(index) {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function handleSubmit() {
        if (!claimId.trim() || !reason.trim()) return;
        setLoading(true);
        setError('');

        try {
            // Send claimID, reason, and files together as FormData
            await fileAppeal(Number(claimId), reason, files);
            onFiled(`Appeal filed for Claim CLM-${claimId}. Staff has been notified.`);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to file appeal.';
            setError(typeof msg === 'string' ? msg : 'Failed to file appeal.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-file-earmark-plus me-2" style={{ color: '#667eea' }}></i>
                    File an Appeal
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <Alert variant="info" className="py-2 small">
                    <i className="bi bi-info-circle me-1"></i>
                    You can only appeal claims with <strong>Rejected</strong> status.
                </Alert>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Claim ID <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Enter Claim ID (e.g. 9)"
                        value={claimId}
                        onChange={e => setClaimId(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Reason for Appeal <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Explain why you are contesting this decision..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                {/* ─── File Browse Section ─── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Supporting Documents</Form.Label>

                    <div
                        className="d-flex align-items-center gap-2 p-3 rounded"
                        style={{
                            border: '2px dashed #c4b5fd',
                            background: '#faf5ff',
                            cursor: 'pointer',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <i className="bi bi-cloud-arrow-up" style={{ fontSize: 24, color: '#667eea' }}></i>
                        <div>
                            <div className="small fw-semibold" style={{ color: '#667eea' }}>
                                Click to browse files
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                PNG, JPG, JPEG, PDF — Images are embedded in the document, PDFs listed as attachments
                            </div>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={handleFilesChange}
                        style={{ display: 'none' }}
                    />

                    {files.length > 0 && (
                        <div className="mt-2">
                            {files.map((file, i) => (
                                <div
                                    key={i}
                                    className="d-flex align-items-center justify-content-between p-2 mb-1 rounded"
                                    style={{ background: '#f8f9fa' }}
                                >
                                    <div className="d-flex align-items-center gap-2 small">
                                        <i className="bi bi-file-earmark-image text-primary"></i>
                                        <span className="fw-medium">{file.name}</span>
                                        <Badge bg="light" text="muted" style={{ fontSize: '0.7rem' }}>
                                            {formatSize(file.size)}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-danger"
                                        onClick={() => removeFile(i)}
                                        title="Remove"
                                    >
                                        <i className="bi bi-x-circle"></i>
                                    </Button>
                                </div>
                            ))}
                            <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                                {files.length} file{files.length !== 1 ? 's' : ''} selected — will be stored as a single PDF
                            </div>
                        </div>
                    )}
                </Form.Group>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !claimId.trim() || !reason.trim()}
                    style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {loading
                        ? <><Spinner size="sm" className="me-1" /> Filing Appeal…</>
                        : <><i className="bi bi-file-earmark-plus me-1"></i>File Appeal</>
                    }
                </Button>
            </Modal.Footer>
        </Modal>
    );
}