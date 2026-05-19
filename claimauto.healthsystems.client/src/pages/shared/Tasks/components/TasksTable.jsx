import { Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { priorityStyle, priorityIcon, statusStyle, statusIcon, formatDate, dueUrgency } from '../utils/taskHelpers';
import { deleteTask } from '../../../../services/tasks/taskService';

export default function TasksTable({ tasks, loading, isAdmin, onView, onComplete, onRefresh, flash }) {

    const handleDelete = async (task) => {
        if (!window.confirm(`Delete task T-${task.taskID}? This cannot be undone.`)) return;
        try {
            await deleteTask(task.taskID);
            flash('Task deleted.');
            onRefresh();
        } catch (err) {
            flash(err.response?.data || 'Failed to delete task.', 'danger');
        }
    };

    return (
        <Card className="shadow-sm border-0" style={{ borderRadius: '14px' }}>
            <Card.Body className="p-0">
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner size="sm" style={{ color: '#667eea' }} />
                        <div className="text-muted small mt-1">Loading tasks…</div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <i className="bi bi-list-task fs-1 d-block mb-2"></i>
                        No tasks found.
                    </div>
                ) : (
                    <Table hover responsive className="mb-0 align-middle">
                        <thead style={{ background: '#f8f9ff' }}>
                            <tr>
                                <th className="ps-3">ID</th>
                                <th>Claim</th>
                                <th>Description</th>
                                <th>Assigned To</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Due Date</th>
                                <th className="text-end pe-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => {
                                const pSt = priorityStyle(t.priority);
                                const sSt = statusStyle(t.status);
                                const urg = dueUrgency(t.dueDate, t.status);

                                return (
                                    <tr key={t.taskID}>
                                        <td className="ps-3 fw-semibold">T-{t.taskID}</td>
                                        <td>CLM-{t.claimID}</td>
                                        <td style={{ maxWidth: 260 }}>
                                            <span className="text-truncate d-inline-block" style={{ maxWidth: 240 }}>
                                                {t.description}
                                            </span>
                                        </td>
                                        <td>{t.assignedToName || '—'}</td>
                                        <td>
                                            <Badge pill style={{ background: pSt.bg, color: pSt.color }}>
                                                <i className={`bi ${priorityIcon(t.priority)} me-1`}></i>
                                                {t.priority}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge pill style={{ background: sSt.bg, color: sSt.color }}>
                                                <i className={`bi ${statusIcon(t.status)} me-1`}></i>
                                                {t.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {formatDate(t.dueDate)}
                                            {urg && (
                                                <Badge
                                                    pill
                                                    className="ms-1"
                                                    style={{ background: urg.color, color: '#fff', fontSize: '0.65rem' }}
                                                >
                                                    {urg.label}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="text-end pe-3">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="p-0 me-2"
                                                title="View Details"
                                                onClick={() => onView(t)}
                                            >
                                                <i className="bi bi-eye" style={{ color: '#667eea' }}></i>
                                            </Button>

                                            {t.status !== 'Completed' && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 me-2"
                                                    title="Mark Complete"
                                                    onClick={() => onComplete(t)}
                                                >
                                                    <i className="bi bi-check-circle" style={{ color: '#16a34a' }}></i>
                                                </Button>
                                            )}

                                            {isAdmin && t.status === 'Pending' && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0"
                                                    title="Delete"
                                                    onClick={() => handleDelete(t)}
                                                >
                                                    <i className="bi bi-trash" style={{ color: '#dc2626' }}></i>
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
}