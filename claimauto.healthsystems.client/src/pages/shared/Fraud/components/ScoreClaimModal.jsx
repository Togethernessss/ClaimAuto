import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { scoreClaim, getFraudScore } from '../../../../services/fraud/fraudService';
import { scoreColor, formatDateTime } from '../utils/fraudHelpers';

export default function ScoreClaimModal({ show, onHide, onScored }) {
    const [claimId, setClaimId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    function reset() {
        setClaimId('');
        setLoading(false);
        setError('');
        setResult(null);
    }

    function handleClose() {
        reset();
        onHide();
    }

    async function handleScore() {
        if (!claimId.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await scoreClaim(Number(claimId));
            setResult(data);
            if (onScored) onScored(data);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to score claim.';
            setError(typeof msg === 'string' ? msg : 'Failed to score claim.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckExisting() {
        if (!claimId.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await getFraudScore(Number(claimId));
            setResult(data);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('No existing score found. Click "Run Scoring" to generate one.');
            } else {
                const msg = err.response?.data?.message || err.response?.data || 'Failed to fetch score.';
                setError(typeof msg === 'string' ? msg : 'Failed to fetch score.');
            }
        } finally {
            setLoading(false);
        }
    }

    const sc = result ? scoreColor(result.scoreValue) : null;

    const FACTOR_META = {
        duplicate_service_code: { label: 'Duplicate Service Code — same code billed in another claim for this member', points: 25 },
        high_billing_frequency: { label: 'High Billing Frequency — provider submitted >10 claims in 30 days', points: 20 },
        amount_spike_300pct: { label: 'Amount Spike — billed amount is 300%+ above provider average', points: 20 },
        repeated_procedure_pattern: { label: 'Repeated Procedure Pattern — same procedure ≥3 times across provider claims', points: 15 },
        first_time_provider: { label: 'First-Time Provider — no prior claims from this provider', points: 0 },
    };

    let factors = [];
    if (result?.factorsJSON) {
        try {
            const raw = JSON.parse(result.factorsJSON);
            factors = raw.map(f => {
                const meta = FACTOR_META[f] || { label: f, points: 0 };
                return { factor: meta.label, points: meta.points };
            });
        } catch { factors = [{ factor: 'Could not parse risk factors — raw data may be malformed.', points: 0 }]; }
    }

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-speedometer2 me-2" style={{ color: '#667eea' }}></i>
                    Fraud Score — Claim Analysis
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Input Section */}
                <div className="d-flex gap-2 mb-3">
                    <Form.Control
                        type="number"
                        placeholder="Enter Claim ID (e.g. 1)"
                        value={claimId}
                        onChange={e => setClaimId(e.target.value)}
                        style={{ borderRadius: '10px', maxWidth: 220 }}
                    />
                    <Button
                        variant="outline-secondary"
                        onClick={handleCheckExisting}
                        disabled={loading || !claimId.trim()}
                        style={{ borderRadius: '10px' }}
                    >
                        Check Existing
                    </Button>
                    <Button
                        onClick={handleScore}
                        disabled={loading || !claimId.trim()}
                        style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            border: 'none', borderRadius: '10px',
                        }}
                    >
                        {loading ? <Spinner size="sm" /> : <><i className="bi bi-play-fill me-1"></i>Run Scoring</>}
                    </Button>
                </div>

                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                {/* Result Section */}
                {result && (
                    <div className="border rounded-3 p-3" style={{ background: '#fafbff' }}>
                        {/* Score Header */}
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <span className="text-muted small">Claim CLM-{result.claimID}</span>
                                <span className="mx-2 text-muted">·</span>
                                <span className="text-muted small">Model: {result.scoringModel}</span>
                                <span className="mx-2 text-muted">·</span>
                                <span className="text-muted small">{formatDateTime(result.generatedAt)}</span>
                            </div>
                            <Badge
                                pill
                                style={{ background: sc.bg, color: sc.color, fontSize: '0.9rem', padding: '6px 14px' }}
                            >
                                <i className="bi bi-shield-exclamation me-1"></i>
                                {result.scoreValue} / 100 — {sc.label}
                            </Badge>
                        </div>

                        {/* Score Bar */}
                        <ProgressBar
                            now={result.scoreValue}
                            max={100}
                            style={{ height: 10, borderRadius: 8, background: '#e9ecef' }}
                            variant={result.scoreValue >= 70 ? 'danger' : result.scoreValue >= 40 ? 'warning' : 'success'}
                            className="mb-3"
                        />

                        {/* Factors */}
                        {factors.length > 0 && (
                            <>
                                <h6 className="fw-semibold mb-2">
                                    <i className="bi bi-list-check me-1"></i>Risk Factors
                                </h6>
                                {factors.map((f, i) => (
                                    <div
                                        key={i}
                                        className="d-flex justify-content-between align-items-center p-2 mb-1 rounded"
                                        style={{ background: f.points > 0 ? '#fff5f5' : '#f9fafb' }}
                                    >
                                        <div>
                                            <i className={`bi ${f.points > 0 ? 'bi-exclamation-triangle text-danger' : 'bi-info-circle text-secondary'} me-2`}></i>
                                            <span className="small">{f.factor}</span>
                                        </div>
                                        <Badge
                                            pill
                                            style={{
                                                fontSize: '0.75rem',
                                                background: f.points > 0 ? '#fee2e2' : '#f3f4f6',
                                                color: f.points > 0 ? '#dc2626' : '#6b7280',
                                            }}
                                        >
                                            {f.points > 0 ? `+${f.points} pts` : 'Info'}
                                        </Badge>
                                    </div>
                                ))}
                            </>
                        )}

                        {result.scoreValue >= 70 && (
                            <Alert variant="danger" className="mt-3 py-2 mb-0">
                                <i className="bi bi-shield-x me-1"></i>
                                <strong>High Risk</strong> — A fraud case has been automatically opened for this claim.
                            </Alert>
                        )}
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={handleClose} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}