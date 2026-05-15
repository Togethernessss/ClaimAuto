import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';

export default function MembersFilters({
  search,
  statusFilter,
  filteredCount,
  totalCount,
  loading,
  onSearchChange,
  onStatusChange,
}) {
  const hasFilters = !!search || statusFilter !== 'All';

  return (
    <Row className="g-3 mb-4">

      {/* Search */}
      <Col md={6} lg={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by name or member number..."
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

      {/* Status filter */}
      <Col md={3}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
        </Form.Select>
      </Col>

      {/* Count + clear filters */}
      <Col className="d-flex align-items-center gap-3">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'member' : 'members'}
          </span>
        )}
        {hasFilters && (
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