import { Row, Col, Card } from 'react-bootstrap';
import { statusStyle, statusIcon } from '../utils/appealHelpers';

export default function AppealsSummary({ appeals }) {
    const filed = appeals.filter(a => a.status === 'Filed').length;
    const underReview = appeals.filter(a => a.status === 'UnderReview').length;
    const decided = appeals.filter(a => a.status === 'Decided').length;
    const withdrawn = appeals.filter(a => a.status === 'Withdrawn').length;

    const stats = [
        { label: 'Filed', count: filed, status: 'Filed' },
        { label: 'Under Review', count: underReview, status: 'UnderReview' },
        { label: 'Decided', count: decided, status: 'Decided' },
        { label: 'Withdrawn', count: withdrawn, status: 'Withdrawn' },
    ];

    return (
        <Row className="g-3 mb-4">
            {stats.map(s => {
                const style = statusStyle(s.status);
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
                                    <i className={`bi ${statusIcon(s.status)}`} style={{ color: style.bg, fontSize: '1.2rem' }}></i>
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