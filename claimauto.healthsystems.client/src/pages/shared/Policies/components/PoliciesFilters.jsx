import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS THIS?
// The search bar + status dropdown + results count row.
// Hidden entirely for Hospital role (they only see active policies anyway).
// ─────────────────────────────────────────────────────────────────────────────

export default function PoliciesFilters({
  search,           // string  — current search text
  statusFilter,     // string  — "All" | "Active" | "Expired" | "Suspended"
  filteredCount,    // number  — how many rows match filters
  totalCount,       // number  — total rows before filter
  loading,          // boolean — hide count while loading
  onSearchChange,   // function(value)
  onStatusChange,   // function(value)
}) {
  return (
    <Row className="g-3 mb-4">

      {/* Search input with clear button */}
      <Col md={6} lg={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by plan code or name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {/* Clear button — only shows when there's text */}
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

      {/* Status dropdown */}
      <Col md={3}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Suspended">Suspended</option>
        </Form.Select>
      </Col>

      {/* Results count */}
      <Col className="d-flex align-items-center gap-3">
      {!loading && (
        <span className="text-muted small">
          {filteredCount} of {totalCount}{' '}
          {totalCount === 1 ? 'policy' : 'policies'}
        </span>
      )}
      {/* Show clear button only when filters are active */}
      {(search || statusFilter !== 'All') && (
        <button
          className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-3"
          style={{ fontSize: '0.78rem' }}
          onClick={() => {
            onSearchChange('');
            onStatusChange('All');
          }}
        >
          <i className="bi bi-x me-1"></i>
          Clear filters
        </button>
      )}
    </Col>

    </Row>
  );
}