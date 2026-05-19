import { Button } from 'react-bootstrap';

export default function TasksHeader({ onCreateClick }) {
    return (
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0">
                <i className="bi bi-list-task me-2" style={{ color: '#667eea' }}></i>
                Task Management
            </h4>
            <Button
                size="sm"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none', borderRadius: '10px',
                }}
                onClick={onCreateClick}
            >
                <i className="bi bi-plus-circle me-1"></i> Create Task
            </Button>
        </div>
    );
}