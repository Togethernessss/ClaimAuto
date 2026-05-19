import { useState, useEffect } from 'react';
import { Modal, Button, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import { getFraudScore } from '../../../../services/fraud/fraudService';
import {
    formatDateTime, scoreColor, priorityStyle, priorityIcon,
    caseStatusStyle, caseStatusIcon, outcomeStyle, outcomeIcon,
} from '../utils/fraudHelpers';

export default function CaseDetailModal({ show, onHide, fraudCase }) {
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && fraudCase) {
            setLoading(true);
            getFraudScore(fraudCase.claimID)
                .then(data => setScore(data))
                .catch(() => setScore(null))
                .finally(() => setLoading(false));
        } else {
            setScore(null);
        }
    }, [show, fraudCase]);

    if (!fraudCase) return null;

    const pStyle = priorityStyle(fraudCase.priority);
    const sStyle = caseStatusStyle(fraudCase.status);

    const FACTOR_META = {
        duplicate_service_code: { label: 'Duplicate Service Code — same code billed in another claim for this member', points: 25 },
        high_billing_frequency: { label: 'High Billing Frequency — provider submitted >10 claims in 30 days', points: 20 },
        amount_spike_300pct: { label: 'Amount Spike — billed amount is 300%+ above provider average', points: 20 },
        repeated_procedure_pattern: { label: 'Repeated Procedure Pattern — same procedure ≥3 times across provider claims', points: 15 },
        first_time_provider: { label: 'First-Time Provider — no prior claims from this provider', points: 0 },
    };

    let factors = [];
    if (score?.factorsJSON) {
        try {
            const raw = JSON.parse(score.factorsJSON);
            factors = raw.map(f => {
                const meta = FACTOR_META[f] || { label: f, points: 0 };
                return { factor: meta.label, points: meta.points };
            });
        } catch { factors = []; }
    }

    let evidence = [];
    if (fraudCase.evidenceURIsJSON) {
        try { evidence = JSON.parse(fraudCase.evidenceURIsJSON); } catch { evidence = []; }
    }

    const sc = score ? scoreColor(score.scoreValue) : null;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-shield-exclamation me-2" style={{ color: '#667eea' }}></i>
                    Fraud Case FC-{fraudCase.caseID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Tabs defaultActiveKey="info" className="mb-3">
                    {/* ─── Case Info Tab ─── */}
                    <Tab eventKey="info" title={<><i className="bi bi-info-circle me-1"></i>Case Info</>}>
                        <div className="row g-3">
                            <div className="col-sm-6">
                                <div className="text-muted small">Claim ID</div>
                                <div className="fw-semibold">CLM-{fraudCase.claimID}</div>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Priority</div>
                                <Badge pill style={{ background: pStyle.bg, color: pStyle.color }}>
                                    <i className={`bi ${priorityIcon(fraudCase.priority)} me-1`}></i>
                                    {fraudCase.priority}
                                </Badge>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Status</div>
                                <Badge pill style={{ background: sStyle.bg, color: sStyle.color }}>
                                    <i className={`bi ${caseStatusIcon(fraudCase.status)} me-1`}></i>
                                    {fraudCase.status}
                                </Badge>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Opened By</div>
                                <div>{fraudCase.openedByName || '—'}</div>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Opened At</div>
                                <div>{formatDateTime(fraudCase.openedAt)}</div>
                            </div>
                            {fraudCase.outcome && (
                                <div className="col-sm-6">
                                    <div className="text-muted small">Outcome</div>
                                    <Badge pill style={{ ...outcomeStyle(fraudCase.outcome), fontSize: '0.8rem' }}>
                                        <i className={`bi ${outcomeIcon(fraudCase.outcome)} me-1`}></i>
                                        {fraudCase.outcome}
                                    </Badge>
                                </div>
                            )}
                            {fraudCase.resolvedAt && (
                                <div className="col-sm-6">
                                    <div className="text-muted small">Resolved At</div>
                                    <div>{formatDateTime(fraudCase.resolvedAt)}</div>
                                </div>
                            )}
                        </div>

                        {/* Investigation Notes */}
                        {fraudCase.investigationNotes && (
                            <div className="mt-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
                                <h6 className="fw-semibold small mb-1">
                                    <i className="bi bi-journal-text me-1"></i>Investigation Notes
                                </h6>
                                <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                                    {fraudCase.investigationNotes}
                                </p>
                            </div>
                        )}

                        {/* Evidence */}
                        {evidence.length > 0 && (
                            <div className="mt-3">
                                <h6 className="fw-semibold small mb-2">
                                    <i className="bi bi-paperclip me-1"></i>Evidence ({evidence.length})
                                </h6>
                                {evidence.map((uri, i) => (
                                    <div key={i} className="small text-primary mb-1">
                                        <i className="bi bi-link-45deg me-1"></i>{uri}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Tab>

                    {/* ─── Fraud Score Tab ─── */}
                    <Tab eventKey="score" title={<><i className="bi bi-speedometer2 me-1"></i>Fraud Score</>}>
                        {loading ? (
                            <div className="text-center py-4">
                                <Spinner size="sm" style={{ color: '#667eea' }} />
                                <div className="text-muted small mt-1">Loading score…</div>
                            </div>
                        ) : score ? (
                            <>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="text-muted small">
                                        Model: {score.scoringModel} · {formatDateTime(score.generatedAt)}
                                    </div>
                                    <Badge pill style={{ background: sc.bg, color: sc.color, fontSize: '0.9rem', padding: '6px 14px' }}>
                                        {score.scoreValue} / 100 — {sc.label}
                                    </Badge>
                                </div>

                                {factors.length > 0 && factors.map((f, i) => (
                                    <div
                                        key={i}
                                        className="d-flex justify-content-between align-items-center p-2 mb-1 rounded"
                                        style={{ background: f.points > 0 ? '#fff5f5' : '#f0fdf0' }}
                                    >
                                        <span className="small">
                                            <i className={`bi ${f.points > 0 ? 'bi-exclamation-triangle text-danger' : 'bi-check-circle text-success'} me-2`}></i>
                                            {f.factor}
                                        </span>
                                        <Badge pill bg={f.points > 0 ? 'danger' : 'success'} style={{ fontSize: '0.75rem' }}>
                                            +{f.points} pts
                                        </Badge>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="text-center py-4 text-muted">
                                <i className="bi bi-speedometer2 fs-3 d-block mb-1"></i>
                                No fraud score found for this claim.
                            </div>
                        )}
                    </Tab>
                </Tabs>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}