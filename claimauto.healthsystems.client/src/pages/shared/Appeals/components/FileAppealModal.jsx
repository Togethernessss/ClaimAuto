import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { fileAppeal } from '../../../../services/appeals/appealService';

export default function FileAppealModal({ show, onHide, onFiled }) {
    const [claimId, setClaimId] = useState('');
    const [reason, setReason] = useState('');
    const [docs, setDocs] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setClaimId('');
        setReason('');
        setDocs('');
        setLoading(false);
        setError('');
    }

    function handleClose() {
        reset();
        onHide();
    }

    async function handleSubmit() {
        if (!claimId.trim() || !reason.trim()) return;
        setLoading(true);
        setError('');
        try {
            let documentsJSON;
            if (docs.trim()) {
                const uris = docs.split('\n').map(s => s.trim()).filter(Boolean);
                documentsJSON = JSON.stringify(uris);
            }

            const dto = {
                claimID: Number(claimId),
                reason,
                documentsJSON: documentsJSON || undefined,
            };

            await fileAppeal(dto);
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
                    You can only appeal claims with <strong>Rejected</strong> or <strong>Adjudicated</strong> status.
                </Alert>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Claim ID <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Enter Claim ID (e.g. 9)"
                        value={claimId}
                        onChange={e => setClaimId(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Reason for Appeal <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Explain why you are contesting this decision..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Supporting Documents</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="One document URI per line (optional)"
                        value={docs}
                        onChange={e => setDocs(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                    <Form.Text className="text-muted">
                        Attach file paths or URLs to medical records, receipts, or other evidence.
                    </Form.Text>
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
                    {loading ? <Spinner size="sm" /> : <><i className="bi bi-file-earmark-plus me-1"></i>File Appeal</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}