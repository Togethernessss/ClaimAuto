import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { resolveFraudCase } from '../../../../services/fraud/fraudService';
import { CASE_OUTCOMES, outcomeStyle, outcomeIcon, priorityStyle } from '../utils/fraudHelpers';

export default function ResolveCaseModal({ show, onHide, fraudCase, onResolved }) {
    const [outcome, setOutcome] = useState('');
    const [notes, setNotes] = useState('');
    const [evidence, setEvidence] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setOutcome('');
        setNotes('');
        setEvidence('');
        setLoading(false);
        setError('');
    }

    function handleClose() {
        reset();
        onHide();
    }

    async function handleSubmit() {
        if (!outcome) return;
        setLoading(true);
        setError('');
        try {
            let evidenceJSON;
            if (evidence.trim()) {
                const uris = evidence.split('\n').map(s => s.trim()).filter(Boolean);
                evidenceJSON = JSON.stringify(uris);
            }

            const dto = {
                outcome,
                investigationNotes: notes || undefined,
                evidenceURIsJSON: evidenceJSON || undefined,
            };

            await resolveFraudCase(fraudCase.caseID, dto);

            const actionMsg = outcome === 'Confirmed'
                ? `Case FC-${fraudCase.caseID} resolved as Confirmed — Claim CLM-${fraudCase.claimID} has been rejected.`
                : outcome === 'Cleared'
                ? `Case FC-${fraudCase.caseID} cleared — Claim CLM-${fraudCase.claimID} has been sent for auto-adjudication.`
                : `Case FC-${fraudCase.caseID} resolved as ${outcome}.`;

            onResolved(actionMsg);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to resolve case.';
            setError(typeof msg === 'string' ? msg : 'Failed to resolve case.');
        } finally {
            setLoading(false);
        }
    }

    if (!fraudCase) return null;

    const pStyle = priorityStyle(fraudCase.priority);

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-gavel me-2" style={{ color: '#e74c3c' }}></i>
                    Resolve Case FC-{fraudCase.caseID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                {/* Case Summary */}
                <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <span className="fw-semibold">Claim CLM-{fraudCase.claimID}</span>
                            <span className="mx-2 text-muted">·</span>
                            <Badge pill style={{ background: pStyle.bg, color: pStyle.color, fontSize: '0.75rem' }}>
                                {fraudCase.priority}
                            </Badge>
                        </div>
                        <span className="text-muted small">{fraudCase.status}</span>
                    </div>
                </div>

                {/* Outcome Selection */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Outcome <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="d-flex gap-2">
                        {CASE_OUTCOMES.map(o => {
                            const oStyle = outcomeStyle(o);
                            const selected = outcome === o;
                            return (
                                <Button
                                    key={o}
                                    onClick={() => setOutcome(o)}
                                    style={{
                                        flex: 1,
                                        borderRadius: '10px',
                                        background: selected ? oStyle.color : 'transparent',
                                        color: selected ? '#fff' : oStyle.color,
                                        border: `2px solid ${oStyle.color}`,
                                        fontWeight: selected ? 600 : 400,
                                    }}
                                >
                                    <i className={`bi ${outcomeIcon(o)} me-1`}></i>{o}
                                </Button>
                            );
                        })}
                    </div>
                </Form.Group>

                {outcome === 'Confirmed' && (
                    <Alert variant="danger" className="py-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Warning:</strong> Confirming fraud will automatically <strong>reject</strong> the linked claim (CLM-{fraudCase.claimID}).
                    </Alert>
                )}

                {outcome === 'Cleared' && (
                    <Alert variant="info" className="py-2">
                        <i className="bi bi-info-circle me-1"></i>
                        <strong>Note:</strong> Clearing this case will automatically trigger <strong>auto-adjudication</strong> on Claim CLM-{fraudCase.claimID}.
                    </Alert>
                )}

                {/* Notes */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Investigation Notes</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Final investigation findings..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                {/* Evidence URIs */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Evidence URIs</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="One URI per line (optional)"
                        value={evidence}
                        onChange={e => setEvidence(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                    <Form.Text className="text-muted">
                        Paste file paths or URLs to supporting evidence, one per line.
                    </Form.Text>
                </Form.Group>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !outcome}
                    style={{
                        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {loading ? <Spinner size="sm" /> : <><i className="bi bi-gavel me-1"></i>Resolve Case</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}