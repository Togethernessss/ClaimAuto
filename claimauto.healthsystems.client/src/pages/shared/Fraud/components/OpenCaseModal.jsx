import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { createFraudCase } from '../../../../services/fraud/fraudService';
import { CASE_PRIORITIES } from '../utils/fraudHelpers';

export default function OpenCaseModal({ show, onHide, onCreated }) {
    const [claimId, setClaimId] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setClaimId('');
        setPriority('Medium');
        setNotes('');
        setLoading(false);
        setError('');
    }

    function handleClose() {
        reset();
        onHide();
    }

    async function handleSubmit() {
        if (!claimId.trim()) return;
        setLoading(true);
        setError('');
        try {
            const dto = {
                claimID: Number(claimId),
                priority,
                investigationNotes: notes || undefined,
            };
            await createFraudCase(dto);
            onCreated(`Fraud case opened for Claim CLM-${claimId}.`);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to open fraud case.';
            setError(typeof msg === 'string' ? msg : 'Failed to open fraud case.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-folder-plus me-2" style={{ color: '#e74c3c' }}></i>
                    Open Fraud Case
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Claim ID <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Enter Claim ID"
                        value={claimId}
                        onChange={e => setClaimId(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Priority</Form.Label>
                    <Form.Select
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    >
                        {CASE_PRIORITIES.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Investigation Notes</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Why do you suspect fraud? (optional)"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !claimId.trim()}
                    style={{
                        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {loading ? <Spinner size="sm" /> : <><i className="bi bi-folder-plus me-1"></i>Open Case</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}