import { Row, Col, Form } from 'react-bootstrap';
import { CASE_PRIORITIES } from '../utils/fraudHelpers';

export default function FraudFilters({ search, onSearchChange, priority, onPriorityChange, total, filtered }) {
    return (
        <Row className="g-2 mb-3 align-items-end">
            <Col md={5}>
                <Form.Control
                    placeholder="Search by Claim ID, opened by..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    style={{ borderRadius: '10px' }}
                />
            </Col>
            <Col md={3}>
                <Form.Select
                    value={priority}
                    onChange={e => onPriorityChange(e.target.value)}
                    style={{ borderRadius: '10px' }}
                >
                    <option value="">All Priorities</option>
                    {CASE_PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </Form.Select>
            </Col>
            <Col md={4} className="text-end text-muted small">
                Showing {filtered} of {total} cases
                {(search || priority) && (
                    <span
                        className="ms-2 text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { onSearchChange(''); onPriorityChange(''); }}
                    >
                        Clear
                    </span>
                )}
            </Col>
        </Row>
    );
}