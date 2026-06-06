import { Card, Form, Row, Col } from 'react-bootstrap';

export default function TasksFilters({
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    search, setSearch,
}) {
    return (
        <Card className="shadow-sm border-0 mb-3" style={{ borderRadius: '14px' }}>
            <Card.Body className="py-2 px-3">
                <Row className="g-2 align-items-center">
                    <Col md={4}>
                        <Form.Control
                            size="sm"
                            placeholder="Search by description, assignee, task ID, claim ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            size="sm"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            size="sm"
                            value={priorityFilter}
                            onChange={e => setPriorityFilter(e.target.value)}
                            style={{ borderRadius: '10px' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </Form.Select>
                    </Col>
                    <Col md={2} className="text-end">
                        <span className="text-muted small">
                            <i className="bi bi-funnel me-1"></i>Filters
                        </span>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
}