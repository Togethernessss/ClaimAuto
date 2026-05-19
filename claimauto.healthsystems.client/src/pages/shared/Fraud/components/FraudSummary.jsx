import { Row, Col, Card } from 'react-bootstrap';
import { caseStatusStyle, caseStatusIcon } from '../utils/fraudHelpers';

export default function FraudSummary({ cases }) {
    const open = cases.filter(c => c.status === 'Open').length;
    const investigating = cases.filter(c => c.status === 'UnderInvestigation').length;
    const resolved = cases.filter(c => c.status === 'Resolved').length;
    const escalated = cases.filter(c => c.status === 'Escalated').length;

    const stats = [
        { label: 'Open', count: open, status: 'Open' },
        { label: 'Under Investigation', count: investigating, status: 'UnderInvestigation' },
        { label: 'Resolved', count: resolved, status: 'Resolved' },
        { label: 'Escalated', count: escalated, status: 'Escalated' },
    ];

    return (
        <Row className="g-3 mb-4">
            {stats.map(s => {
                const style = caseStatusStyle(s.status);
                return (
                    <Col xs={6} lg={3} key={s.status}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px' }}>
                            <Card.Body className="d-flex align-items-center gap-3 py-3">
                                <div
                                    className="d-flex align-items-center justify-content-center"
                                    style={{
                                        width: 44, height: 44, borderRadius: '12px',
                                        background: style.bg + '22',
                                    }}
                                >
                                    <i className={`bi ${caseStatusIcon(s.status)}`} style={{ color: style.bg, fontSize: '1.2rem' }}></i>
                                </div>
                                <div>
                                    <div className="text-muted small">{s.label}</div>
                                    <div className="fw-bold fs-5">{s.count}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
}