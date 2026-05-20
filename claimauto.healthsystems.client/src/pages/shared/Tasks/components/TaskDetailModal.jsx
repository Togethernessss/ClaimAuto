import { Modal, Button, Badge } from 'react-bootstrap';
import { formatDateTime, formatDate, priorityStyle, priorityIcon, statusStyle, statusIcon, dueUrgency } from '../utils/taskHelpers';

export default function TaskDetailModal({ show, onHide, task }) {
    if (!task) return null;

    const pSt = priorityStyle(task.priority);
    const sSt = statusStyle(task.status);
    const urg = dueUrgency(task.dueDate, task.status);

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-list-task me-2" style={{ color: '#667eea' }}></i>
                    Task T-{task.taskID}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className="row g-3">
                    <div className="col-sm-6">
                        <div className="text-muted small">Claim ID</div>
                        <div className="fw-semibold">CLM-{task.claimID}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Assigned To</div>
                        <div className="fw-semibold">{task.assignedToName || '—'}</div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Priority</div>
                        <Badge pill style={{ background: pSt.bg, color: pSt.color }}>
                            <i className={`bi ${priorityIcon(task.priority)} me-1`}></i>
                            {task.priority}
                        </Badge>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Status</div>
                        <Badge pill style={{ background: sSt.bg, color: sSt.color }}>
                            <i className={`bi ${statusIcon(task.status)} me-1`}></i>
                            {task.status}
                        </Badge>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Due Date</div>
                        <div>
                            {formatDate(task.dueDate)}
                            {urg && (
                                <Badge
                                    pill
                                    className="ms-2"
                                    style={{ background: urg.color, color: '#fff', fontSize: '0.7rem' }}
                                >
                                    {urg.label}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div className="text-muted small">Created At</div>
                        <div>{formatDateTime(task.createdAt)}</div>
                    </div>
                    {task.completedAt && (
                        <div className="col-sm-6">
                            <div className="text-muted small">Completed At</div>
                            <div>{formatDateTime(task.completedAt)}</div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="mt-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
                    <h6 className="fw-semibold small mb-1">
                        <i className="bi bi-journal-text me-1"></i>Description
                    </h6>
                    <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                        {task.description}
                    </p>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}