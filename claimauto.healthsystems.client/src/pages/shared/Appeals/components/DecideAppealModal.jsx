import { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import { decideAppeal } from '../../../../services/appeals/appealService';
import { getClaimById } from '../../../../services/claims/claimService';
import { APPEAL_OUTCOMES, outcomeStyle, outcomeIcon, statusStyle } from '../utils/appealHelpers';

export default function DecideAppealModal({ show, onHide, appeal, onDecided }) {
    const [outcome, setOutcome] = useState('');
    const [partialAmount, setPartialAmount] = useState('');
    const [partialReason, setPartialReason] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Loaded only when outcome === 'PartiallyUpheld' — used to validate the cap.
    const [claimDetail, setClaimDetail] = useState(null);
    const [claimLoading, setClaimLoading] = useState(false);

    function reset() {
        setOutcome('');
        setPartialAmount('');
        setPartialReason('');
        setLoading(false);
        setError('');
        setClaimDetail(null);
    }

    function handleClose() {
        reset();
        onHide();
    }

    // ── Lazy-load claim details once the user picks PartiallyUpheld ──
    useEffect(() => {
        if (outcome !== 'PartiallyUpheld' || !appeal?.claimID) return;
        if (claimDetail) return;   // already loaded

        let cancelled = false;
        setClaimLoading(true);
        getClaimById(appeal.claimID)
            .then(data => { if (!cancelled) setClaimDetail(data); })
            .catch(() => { if (!cancelled) setError('Could not load claim details. Please retry.'); })
            .finally(() => { if (!cancelled) setClaimLoading(false); });
        return () => { cancelled = true; };
    }, [outcome, appeal?.claimID, claimDetail]);

    // ── Validation (mirrors backend rules so user gets immediate feedback) ──
    const billed   = claimDetail?.totalBilledAmount ?? 0;
    const amountNum = parseFloat(partialAmount);
    const partialValid =
        outcome !== 'PartiallyUpheld' ||
        (
            !Number.isNaN(amountNum) &&
            amountNum > 0 &&
            amountNum <= billed &&
            partialReason.trim().length >= 10
        );

    const percent = (billed > 0 && amountNum > 0 && amountNum <= billed)
        ? Math.round((amountNum / billed) * 100)
        : null;

    async function handleSubmit() {
        if (!outcome) return;
        if (!partialValid) return;
        setLoading(true);
        setError('');
        try {
            await decideAppeal(
                appeal.appealID,
                outcome,
                outcome === 'PartiallyUpheld' ? amountNum : null,
                outcome === 'PartiallyUpheld' ? partialReason.trim() : null,
            );

            let actionMsg;
            if (outcome === 'Overturned') {
                actionMsg = `Appeal APL-${appeal.appealID} overturned — Claim CLM-${appeal.claimID} has been reset to Submitted.`;
            } else if (outcome === 'PartiallyUpheld') {
                actionMsg = `Appeal APL-${appeal.appealID} partially upheld — ₹${amountNum.toLocaleString('en-IN')} payment created for CLM-${appeal.claimID}.`;
            } else {
                actionMsg = `Appeal APL-${appeal.appealID} decided as ${outcome}.`;
            }

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

                {/* ── PARTIALLY UPHELD: amount + reason inputs ────────────── */}
                {outcome === 'PartiallyUpheld' && (
                    <div
                        className="p-3 rounded mb-2"
                        style={{ background: '#fff8e6', border: '1px solid #ffe6a8' }}
                    >
                        <div className="small fw-semibold mb-2" style={{ color: '#a06200' }}>
                            <i className="bi bi-hand-index-thumb me-1"></i>
                            Partial Approval — enter the amount to approve
                        </div>

                        {claimLoading && (
                            <div className="small text-muted mb-2">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Loading claim details…
                            </div>
                        )}

                        {claimDetail && (
                            <div className="small text-muted mb-2">
                                <span>Original billed amount: </span>
                                <strong>₹{Number(billed).toLocaleString('en-IN')}</strong>
                            </div>
                        )}

                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-semibold mb-1">
                                Approved Amount (₹) <span className="text-danger">*</span>
                            </Form.Label>
                            <InputGroup hasValidation>
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    max={billed || undefined}
                                    step="0.01"
                                    placeholder="e.g. 25000"
                                    value={partialAmount}
                                    onChange={e => setPartialAmount(e.target.value)}
                                    isInvalid={!!partialAmount && !Number.isNaN(amountNum) &&
                                               (amountNum <= 0 || (billed > 0 && amountNum > billed))}
                                    disabled={claimLoading}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {amountNum <= 0
                                        ? 'Must be greater than 0.'
                                        : `Cannot exceed billed amount (₹${Number(billed).toLocaleString('en-IN')}).`}
                                </Form.Control.Feedback>
                            </InputGroup>
                            {percent !== null && (
                                <Form.Text className="text-muted">
                                    Approving <strong>{percent}%</strong> of the original billed amount.
                                </Form.Text>
                            )}
                        </Form.Group>

                        <Form.Group>
                            <Form.Label className="small fw-semibold mb-1">
                                Reason / Notes <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Explain why only this portion is being approved (min 10 characters). This is recorded in the audit log and shown to the filer."
                                value={partialReason}
                                onChange={e => setPartialReason(e.target.value)}
                                isInvalid={!!partialReason && partialReason.trim().length < 10}
                                maxLength={500}
                            />
                            <Form.Control.Feedback type="invalid">
                                At least 10 characters required.
                            </Form.Control.Feedback>
                            <Form.Text className="text-muted">
                                {partialReason.length}/500
                            </Form.Text>
                        </Form.Group>

                        <div className="small text-muted mt-2">
                            <i className="bi bi-info-circle me-1"></i>
                            A payment of the approved amount will be created with status <strong>Pending</strong> and
                            the claim will move to <strong>Approved</strong>.
                        </div>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !outcome || !partialValid || claimLoading}
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
