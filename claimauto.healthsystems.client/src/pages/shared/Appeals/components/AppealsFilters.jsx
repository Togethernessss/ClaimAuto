import { Row, Col, Form } from 'react-bootstrap';

export default function AppealsFilters({ search, onSearchChange, total, filtered }) {
    return (
        <Row className="g-2 mb-3 align-items-end">
            <Col md={8}>
                <Form.Control
                    placeholder="Search by Appeal ID, Claim ID, filed by..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    style={{ borderRadius: '10px' }}
                />
            </Col>
            <Col md={4} className="text-end text-muted small">
                Showing {filtered} of {total} appeals
                {search && (
                    <span
                        className="ms-2 text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSearchChange('')}
                    >
                        Clear
                    </span>
                )}
            </Col>
        </Row>
    );
}