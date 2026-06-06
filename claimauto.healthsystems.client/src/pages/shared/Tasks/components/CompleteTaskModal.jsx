import { useState } from 'react';
import { Modal, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { completeTask } from '../../../../services/tasks/taskService';
import { priorityStyle, priorityIcon } from '../utils/taskHelpers';

export default function CompleteTaskModal({ show, onHide, task, onCompleted }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!task) return null;

    const pSt = priorityStyle(task.priority);

    const handleConfirm = async () => {
        setSaving(true);
        setError('');
        try {
            await completeTask(task.taskID);
            onCompleted();
            onHide();
        } catch (err) {
            setError(err.response?.data || 'Failed to complete task.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton style={{ background: '#f0fdf4', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-check-circle me-2" style={{ color: '#16a34a' }}></i>
                    Complete Task
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

                <p className="mb-2">
                    Mark task <strong>T-{task.taskID}</strong> as completed?
                </p>

                <div className="p-3 rounded" style={{ background: '#f8f9fa' }}>
                    <div className="small text-muted mb-1">
                        <strong>Claim:</strong> CLM-{task.claimID}
                    </div>
                    <div className="small text-muted mb-1">
                        <strong>Priority:</strong>{' '}
                        <Badge pill style={{ background: pSt.bg, color: pSt.color }}>
                            <i className={`bi ${priorityIcon(task.priority)} me-1`}></i>
                            {task.priority}
                        </Badge>
                    </div>
                    <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
                        {task.description}
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    variant="success"
                    disabled={saving}
                    onClick={handleConfirm}
                    style={{ borderRadius: '10px' }}
                >
                    {saving ? <><Spinner size="sm" className="me-1" /> Completing…</> : 'Mark Complete'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}