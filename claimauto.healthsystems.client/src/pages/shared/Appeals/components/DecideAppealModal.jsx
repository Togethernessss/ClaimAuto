import { useState } from 'react';
import { Modal, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { decideAppeal } from '../../../../services/appeals/appealService';
import { APPEAL_OUTCOMES, outcomeStyle, outcomeIcon, statusStyle } from '../utils/appealHelpers';

export default function DecideAppealModal({ show, onHide, appeal, onDecided }) {
    const [outcome, setOutcome] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setOutcome('');
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
            await decideAppeal(appeal.appealID, outcome);

            const actionMsg = outcome === 'Overturned'
                ? `Appeal APL-${appeal.appealID} overturned — Claim CLM-${appeal.claimID} has been reset to Submitted.`
                : `Appeal APL-${appeal.appealID} decided as ${outcome}.`;

            onDecided(actionMsg);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to decide appeal.';
            setError(typeof msg === 'string' ? msg : 'Failed to decide appeal.');
        } finally {
            setLoading(false);
        }
    }

    if (!appeal) return null;

    const sStyle = statusStyle(appeal.status);

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-gavel me-2" style={{ color: '#667eea' }}></i>
                    Decide Appeal APL-{appeal.appealID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                {/* Appeal Summary */}
                <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold">Claim CLM-{appeal.claimID}</span>
                        <Badge pill style={{ background: sStyle.bg, color: sStyle.color, fontSize: '0.75rem' }}>
                            {appeal.status}
                        </Badge>
                    </div>
                    <div className="small text-muted">Filed by: {appeal.filedByName}</div>
                    <div className="small text-muted mt-1">Reason: {appeal.reason}</div>
                </div>

                {/* Outcome Selection */}
                <div className="mb-3">
                    <label className="fw-semibold small d-block mb-2">
                        Decision <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex gap-2">
                        {APPEAL_OUTCOMES.map(o => {
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
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <i className={`bi ${outcomeIcon(o)} me-1`}></i>
                                    {o === 'PartiallyUpheld' ? 'Partial' : o}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {outcome === 'Overturned' && (
                    <Alert variant="success" className="py-2">
                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                        <strong>Note:</strong> Overturning will reset Claim CLM-{appeal.claimID} back to <strong>Submitted</strong> for re-processing.
                    </Alert>
                )}

                {outcome === 'Upheld' && (
                    <Alert variant="warning" className="py-2">
                        <i className="bi bi-hand-thumbs-down me-1"></i>
                        The original decision will stand. The claim remains in its current status.
                    </Alert>
                )}
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !outcome}
                    style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {loading ? <Spinner size="sm" /> : <><i className="bi bi-gavel me-1"></i>Submit Decision</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}