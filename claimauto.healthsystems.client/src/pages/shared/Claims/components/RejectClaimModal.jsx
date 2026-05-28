import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { staffRejectClaim } from '../../../../services/claims/claimService';

/**
 * RejectClaimModal
 * ─────────────────────────────────────────────────────────────────────
 * Lets Admin/InsuranceStaff reject a claim at their discretion.
 * Forces a meaningful reason (min 10 chars) which is logged + sent to filer.
 *
 * Props:
 *   show       : boolean
 *   onHide     : () => void
 *   claim      : the claim object (uses claim.claimID and claim.status)
 *   onRejected : (message) => void — success callback (refresh parent)
 */
export default function RejectClaimModal({ show, onHide, claim, onRejected }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function reset() {
        setReason('');
        setLoading(false);
        setError('');
    }

    function handleClose() {
        if (loading) return;
        reset();
        onHide();
    }

    async function handleSubmit() {
        if (!reason.trim()) {
            setError('Please provide a reason for the rejection.');
            return;
        }
        if (reason.trim().length < 10) {
            setError('Reason must be at least 10 characters long.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await staffRejectClaim(claim.claimID, reason.trim());
            onRejected?.(result.message || `Claim CLM-${claim.claimID} rejected.`);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to reject the claim. Please try again.';
            setError(typeof msg === 'string' ? msg : 'Failed to reject the claim.');
        } finally {
            setLoading(false);
        }
    }

    if (!claim) return null;

    return (
        <Modal show={show} onHide={handleClose} centered backdrop="static">
            <Modal.Header
                closeButton={!loading}
                style={{ background: '#fff5f5', borderBottom: '1px solid #fecaca' }}
            >
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem', color: '#c0392b' }}>
                    <i className="bi bi-x-octagon-fill me-2"></i>
                    Reject Claim CLM-{claim.claimID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && (
                    <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>
                        <i className="bi bi-exclamation-triangle me-1"></i>{error}
                    </Alert>
                )}

                <Alert variant="warning" className="py-2 small">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    <strong>This is a final action.</strong> Rejecting this claim will:
                    <ul className="mb-0 mt-1">
                        <li>Set the claim status to <strong>Rejected</strong></li>
                        <li>Notify the claim filer with your reason</li>
                        <li>Log this action with your username in the audit trail</li>
                        <li>Block any further document uploads or adjudication</li>
                    </ul>
                </Alert>

                {/* ─── Claim summary ─── */}
                <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa' }}>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold">Current Status:</span>
                        <Badge bg="primary">{claim.status}</Badge>
                    </div>
                    <div className="small text-muted">
                        Filed by: {claim.providerName || claim.filedByName || 'Unknown'}
                    </div>
                    {claim.totalBilledAmount && (
                        <div className="small text-muted">
                            Amount: ₹{Number(claim.totalBilledAmount).toLocaleString('en-IN')}
                        </div>
                    )}
                </div>

                {/* ─── Reason input ─── */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">
                        Reason for Rejection <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain why this claim is being rejected. Be specific — this reason will be sent to the filer and logged in the audit trail."
                        disabled={loading}
                        style={{ borderRadius: '10px' }}
                        maxLength={500}
                    />
                    <Form.Text className={reason.length < 10 ? 'text-danger' : 'text-muted'}>
                        {reason.length}/500 characters
                        {reason.length < 10 && ' (minimum 10 required)'}
                    </Form.Text>
                </Form.Group>

                {/* ─── Sample reasons ─── */}
                <div className="small text-muted mb-2">
                    <strong>Common reasons:</strong>
                </div>
                <div className="d-flex flex-wrap gap-1 mb-2">
                    {[
                        'Submitted documents are illegible or incomplete.',
                        'Procedure not covered under the policy plan.',
                        'Suspected fraud or tampered documentation.',
                        'Claim filed outside the policy effective period.',
                        'Service not medically necessary based on records.',
                    ].map((sample) => (
                        <Button
                            key={sample}
                            variant="outline-secondary"
                            size="sm"
                            disabled={loading}
                            onClick={() => setReason(sample)}
                            style={{ fontSize: '0.75rem', borderRadius: '12px' }}
                        >
                            {sample}
                        </Button>
                    ))}
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #fecaca' }}>
                <Button
                    variant="outline-secondary"
                    onClick={handleClose}
                    disabled={loading}
                    style={{ borderRadius: '10px' }}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    onClick={handleSubmit}
                    disabled={loading || reason.trim().length < 10}
                    style={{ borderRadius: '10px' }}
                >
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Rejecting…
                        </>
                    ) : (
                        <>
                            <i className="bi bi-x-octagon me-1"></i>
                            Confirm Rejection
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}