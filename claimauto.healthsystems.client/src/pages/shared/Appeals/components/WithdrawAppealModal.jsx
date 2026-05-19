import { useState } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { withdrawAppeal } from '../../../../services/appeals/appealService';

export default function WithdrawAppealModal({ show, onHide, appeal, onWithdrawn }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function handleClose() {
        setLoading(false);
        setError('');
        onHide();
    }

    async function handleWithdraw() {
        setLoading(true);
        setError('');
        try {
            await withdrawAppeal(appeal.appealID);
            onWithdrawn(`Appeal APL-${appeal.appealID} has been withdrawn.`);
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to withdraw appeal.';
            setError(typeof msg === 'string' ? msg : 'Failed to withdraw appeal.');
        } finally {
            setLoading(false);
        }
    }

    if (!appeal) return null;

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-x-circle me-2" style={{ color: '#e74c3c' }}></i>
                    Withdraw Appeal
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <p>Are you sure you want to withdraw this appeal?</p>

                <div className="p-3 rounded" style={{ background: '#f8f9fa' }}>
                    <div className="fw-semibold">Appeal APL-{appeal.appealID}</div>
                    <div className="small text-muted">Claim CLM-{appeal.claimID}</div>
                    <div className="small text-muted mt-1">Reason: {appeal.reason}</div>
                </div>

                <Alert variant="warning" className="py-2 mt-3">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    This action cannot be undone. You may file a new appeal later if needed.
                </Alert>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleWithdraw}
                    disabled={loading}
                    style={{
                        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {loading ? <Spinner size="sm" /> : <><i className="bi bi-x-circle me-1"></i>Withdraw Appeal</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}