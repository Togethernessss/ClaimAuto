// src/pages/shared/Fraud/components/FraudFilters.jsx
import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { CASE_PRIORITIES } from '../utils/fraudHelpers';

// Case statuses for the dropdown — mirrors how ClaimsFilters handles claim statuses
const CASE_STATUSES = ['Open', 'UnderInvestigation', 'Resolved', 'Escalated'];

export default function FraudFilters({
  search,
  statusFilter,
  priority,
  filteredCount,
  totalCount,
  loading,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
}) {
  const hasFilters = !!search || statusFilter !== 'All' || !!priority;

  return (
    <Row className="g-3 mb-4">

      {/* Search */}
      <Col md={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by Case ID, Claim ID, opened by..."
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

      {/* Status filter */}
      <Col md={2}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'UnderInvestigation' ? 'Under Investigation' : s}
            </option>
          ))}
        </Form.Select>
      </Col>

      {/* Priority filter */}
      <Col md={2}>
        <Form.Select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
        >
          <option value="">All Priorities</option>
          {CASE_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Form.Select>
      </Col>

      {/* Count + clear */}
      <Col className="d-flex align-items-center gap-3">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'case' : 'cases'}
          </span>
        )}
        {hasFilters && (
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-3"
            style={{ fontSize: '0.78rem' }}
            onClick={() => {
              onSearchChange('');
              onStatusChange('All');
              onPriorityChange('');
            }}
          >
            <i className="bi bi-x me-1"></i>Clear filters
          </button>
        )}
      </Col>

    </Row>
  );
}
