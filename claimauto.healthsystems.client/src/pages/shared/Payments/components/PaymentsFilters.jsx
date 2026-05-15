import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';

export default function PaymentsFilters({
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
            placeholder="Search by payment ID or payee name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <Button
              variant="outline-secondary"
              onClick={() => onSearchChange('')}
            >
              <i className="bi bi-x"></i>
            </Button>
          )}
        </InputGroup>
      </Col>

      <Col md={3}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Authorized">Authorized</option>
          <option value="Executed">Executed</option>
          <option value="OnHold">On Hold</option>
        </Form.Select>
      </Col>

      <Col className="d-flex align-items-center">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'payment' : 'payments'}
          </span>
        )}
      </Col>

    </Row>
  );
}