// src/pages/shared/Adjudication/components/AdjudicationFilters.jsx
// Only shows statuses relevant to the History tab (no Validated/Paid — not meaningful here)
import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';

export default function AdjudicationFilters({
  search,
  statusFilter,
  filteredCount,
  totalCount,
  loading,
  onSearchChange,
  onStatusChange,
}) {
  return (
    <Row className="g-3 mb-4">

      <Col md={6} lg={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by claim ID, member, or provider..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <Button variant="outline-secondary" onClick={() => onSearchChange('')}>
              <i className="bi bi-x"></i>
            </Button>
          )}
        </InputGroup>
      </Col>

      <Col md={3}>
        <Form.Select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="All">All Statuses</option>
          {/* Only statuses that appear on adjudication page */}
          <option value="Submitted">Submitted</option>
          <option value="UnderReview">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Paid">Paid</option>
        </Form.Select>
      </Col>

      <Col className="d-flex align-items-center">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'claim' : 'claims'}
          </span>
        )}
      </Col>

    </Row>
  );
}
