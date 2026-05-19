// src/pages/Admin/Rules/components/RulesFilters.jsx
import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';

export default function RulesFilters({
  search,
  typeFilter,
  filteredCount,
  totalCount,
  loading,
  onSearchChange,
  onTypeChange,
}) {
  const hasFilters = !!search || typeFilter !== 'All';

  return (
    <Row className="g-3 mb-4">

      <Col md={6} lg={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by rule name or description..."
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
        <Form.Select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)}>
          <option value="All">All Types</option>
          <option value="Coverage">Coverage</option>
          <option value="Payment">Payment</option>
          <option value="Validation">Validation</option>
        </Form.Select>
      </Col>

      <Col className="d-flex align-items-center gap-3">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'rule' : 'rules'}
          </span>
        )}
        {hasFilters && (
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-3"
            style={{ fontSize: '0.78rem' }}
            onClick={() => { onSearchChange(''); onTypeChange('All'); }}
          >
            <i className="bi bi-x me-1"></i>Clear
          </button>
        )}
      </Col>

    </Row>
  );
}
