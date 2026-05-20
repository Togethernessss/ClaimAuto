import { Card, Row, Col } from 'react-bootstrap';

export default function TasksSummary({ tasks }) {
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'InProgress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => t.status === 'Overdue').length;

    const cards = [
        { label: 'Pending', count: pending, icon: 'bi-hourglass-split', bg: '#dbeafe', color: '#1e40af' },
        { label: 'In Progress', count: inProgress, icon: 'bi-arrow-repeat', bg: '#fef9c3', color: '#854d0e' },
        { label: 'Completed', count: completed, icon: 'bi-check-circle-fill', bg: '#dcfce7', color: '#166534' },
        { label: 'Overdue', count: overdue, icon: 'bi-alarm-fill', bg: '#fee2e2', color: '#991b1b' },
    ];

    return (
        <Row className="g-3 mb-3">
            {cards.map(c => (
                <Col key={c.label} xs={6} md={3}>
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '14px' }}>
                        <Card.Body className="d-flex align-items-center gap-3 py-3">
                            <div
                                style={{
                                    width: 44, height: 44, borderRadius: '12px',
                                    background: c.bg, color: c.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20,
                                }}
                            >
                                <i className={`bi ${c.icon}`}></i>
                            </div>
                            <div>
                                <div className="text-muted small">{c.label}</div>
                                <div className="fw-bold fs-5">{c.count}</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
}