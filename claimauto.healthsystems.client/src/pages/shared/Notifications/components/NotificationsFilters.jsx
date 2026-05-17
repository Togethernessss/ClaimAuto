import { Row, Col, Form } from 'react-bootstrap';

export default function NotificationsFilters({
  statusFilter,
  categoryFilter,
  filteredCount,
  loading,
  onStatusChange,
  onCategoryChange,
}) {
  return (
    <Row className="g-3 mb-4">
      <Col md={3}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{ fontSize: 13 }}
        >
          <option value="All">All Statuses</option>
          <option value="Unread">Unread</option>
          <option value="Read">Read</option>
          <option value="Dismissed">Dismissed</option>
        </Form.Select>
      </Col>

      <Col md={3}>
        <Form.Select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{ fontSize: 13 }}
        >
          <option value="All">All Categories</option>
          <option value="Payment">Payment</option>
          <option value="Appeal">Appeal</option>
          <option value="Exception">Exception</option>
        </Form.Select>
      </Col>

      <Col className="d-flex align-items-center">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} {filteredCount === 1 ? 'notification' : 'notifications'}
          </span>
        )}
      </Col>
    </Row>
  );
}