import { Modal, Button, Badge } from 'react-bootstrap';
import {
    formatDateTime, statusStyle, statusIcon,
    outcomeStyle, outcomeIcon, outcomeLabel,
} from '../utils/appealHelpers';
import { downloadAppealPdf } from '../../../../services/appeals/appealService';

export default function AppealDetailModal({ show, onHide, appeal }) {
    if (!appeal) return null;

    const sStyle = statusStyle(appeal.status);

    let documents = [];
    if (appeal.documentsJSON) {
        try { documents = JSON.parse(appeal.documentsJSON); } catch { documents = []; }
    }

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-megaphone me-2" style={{ color: '#667eea' }}></i>
                    Appeal APL-{appeal.appealID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                        <div className="text-muted small">Claim ID</div>
                        <div className="fw-semibold">CLM-{appeal.claimID}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Status</div>
                        <Badge pill style={{ background: sStyle.bg, color: sStyle.color }}>
                            <i className={`bi ${statusIcon(appeal.status)} me-1`}></i>
                            {appeal.status === 'UnderReview' ? 'Under Review' : appeal.status}
                        </Badge>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Filed By</div>
                        <div>{appeal.filedByName || '—'}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Filed At</div>
                        <div>{formatDateTime(appeal.filedAt)}</div>
                    </div>

                    {appeal.outcome && (
                        <>
                            <div className="col-sm-6">
                                <div className="text-muted small">Outcome</div>
                                <Badge pill style={{ ...outcomeStyle(appeal.outcome), fontSize: '0.85rem', padding: '5px 12px' }}>
                                    <i className={`bi ${outcomeIcon(appeal.outcome)} me-1`}></i>
                                    {outcomeLabel(appeal.outcome)}
                                </Badge>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Decided By</div>
                                <div>{appeal.decisionByName || '—'}</div>
                            </div>
                            <div className="col-sm-6">
                                <div className="text-muted small">Decided At</div>
                                <div>{formatDateTime(appeal.decisionAt)}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Reason */}
                <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa' }}>
                    <h6 className="fw-semibold small mb-1">
                        <i className="bi bi-chat-left-text me-1"></i>Reason for Appeal
                    </h6>
                    <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                        {appeal.reason}
                    </p>
                </div>

                {/* Documents list */}
                {documents.length > 0 && (
                    <div className="mb-3">
                        <h6 className="fw-semibold small mb-2">
                            <i className="bi bi-paperclip me-1"></i>Attached Documents ({documents.length})
                        </h6>
                        {documents.map((name, i) => (
                            <div key={i} className="small text-muted mb-1">
                                <i className="bi bi-file-earmark-image text-primary me-1"></i>{name}
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                {appeal.hasPDF && (
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => downloadAppealPdf(appeal.appealID)}
                        style={{ borderRadius: '10px', marginRight: 'auto' }}
                    >
                        <i className="bi bi-file-earmark-pdf me-1"></i>Download Documents PDF
                    </Button>
                )}
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}