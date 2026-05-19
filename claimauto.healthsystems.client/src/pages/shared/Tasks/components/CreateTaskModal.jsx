import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { createTask, getAssignableUsers } from '../../../../services/tasks/taskService';

export default function CreateTaskModal({ show, onHide, onCreated }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    const [staffList, setStaffList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [assignedTo, setAssignedTo] = useState('');
    const [claimID, setClaimID] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Load assignable users when modal opens
    useEffect(() => {
        if (show) {
            setLoadingUsers(true);
            getAssignableUsers()
                .then(list => {
                    setStaffList(list);
                    // If staff (no access to user list), default to self
                    if (list.length === 0 && user) {
                        setAssignedTo(String(user.userID));
                    } else {
                        setAssignedTo('');
                    }
                })
                .finally(() => setLoadingUsers(false));

            // Reset form
            setClaimID('');
            setDescription('');
            setDueDate('');
            setPriority('Medium');
            setError('');
        }
    }, [show, user]);

    const handleSubmit = async () => {
        if (!assignedTo || !claimID || !description.trim()) {
            setError('Assigned To, Claim ID, and Description are required.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await createTask({
                assignedTo: parseInt(assignedTo),
                claimID: parseInt(claimID),
                description: description.trim(),
                dueDate: dueDate || null,
                priority,
            });
            onCreated();
            onHide();
        } catch (err) {
            setError(err.response?.data || 'Failed to create task.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton style={{ background: '#f8f9ff', borderBottom: '1px solid #e9ecef' }}>
                <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-plus-circle me-2" style={{ color: '#667eea' }}></i>
                    Create Task
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

                <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Assign To</Form.Label>
                    {loadingUsers ? (
                        <div><Spinner size="sm" /> Loading users…</div>
                    ) : isAdmin && staffList.length > 0 ? (
                        <Form.Select
                            size="sm"
                            value={assignedTo}
                            onChange={e => setAssignedTo(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        >
                            <option value="">— Select staff member —</option>
                            {staffList.map(u => (
                                <option key={u.userID} value={u.userID}>
                                    {u.name} ({u.role})
                                </option>
                            ))}
                        </Form.Select>
                    ) : (
                        <Form.Control
                            size="sm"
                            readOnly
                            value={user?.name || ''}
                            style={{ borderRadius: '10px', background: '#f8f9fa' }}
                        />
                    )}
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Claim ID</Form.Label>
                    <Form.Control
                        size="sm"
                        type="number"
                        placeholder="e.g. 5"
                        value={claimID}
                        onChange={e => setClaimID(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        size="sm"
                        placeholder="What needs to be done for this claim?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        style={{ borderRadius: '10px' }}
                    />
                </Form.Group>

                <div className="d-flex gap-3">
                    <Form.Group className="flex-fill">
                        <Form.Label className="small fw-semibold">Due Date</Form.Label>
                        <Form.Control
                            size="sm"
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        />
                    </Form.Group>

                    <Form.Group className="flex-fill">
                        <Form.Label className="small fw-semibold">Priority</Form.Label>
                        <Form.Select
                            size="sm"
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </Form.Select>
                    </Form.Group>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef' }}>
                <Button variant="outline-secondary" onClick={onHide} style={{ borderRadius: '10px' }}>
                    Cancel
                </Button>
                <Button
                    disabled={saving}
                    onClick={handleSubmit}
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none', borderRadius: '10px',
                    }}
                >
                    {saving ? <><Spinner size="sm" className="me-1" /> Creating…</> : 'Create Task'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}