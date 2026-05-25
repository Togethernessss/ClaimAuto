import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function RemittanceFilters({
  search,
  statusFilter,
  dateFrom,
  dateTo,
  filteredCount,
  totalCount,
  loading,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  const hasFilters = search ||
    statusFilter !== 'All' ||
    dateFrom || dateTo;

  return (
    <Row className="g-3 mb-4 align-items-center">

      {/* Search */}
      <Col md={4}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by ID, hospital or claim..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ fontSize: 13 }}
          />
          {search && (
            <Button variant="outline-secondary"
              onClick={() => onSearchChange('')}>
              <i className="bi bi-x"></i>
            </Button>
          )}
        </InputGroup>
      </Col>

      {/* Status */}
      <Col md={2}>
        <Form.Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{ fontSize: 13 }}
        >
          <option value="All">All Statuses</option>
          {!isHospital && (
            <option value="Generated">Generated</option>
          )}
          <option value="Sent">Sent</option>
          <option value="Acknowledged">Acknowledged</option>
        </Form.Select>
      </Col>

      {/* Date from */}
      <Col md={2}>
        <Form.Control
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={{ fontSize: 13 }}
        />
      </Col>

      {/* Date to */}
      <Col md={2}>
        <Form.Control
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          style={{ fontSize: 13 }}
        />
      </Col>

      {/* Count + clear */}
      <Col className="d-flex align-items-center gap-2">
        {!loading && (
          <span className="text-muted small">
            {filteredCount}{' '}
            {filteredCount === 1 ? 'remittance' : 'remittances'}
          </span>
        )}
        {hasFilters && (
          <span
            onClick={onClearFilters}
            style={{
              fontSize: 12,
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            <i className="bi bi-x-circle me-1"></i>
            Clear
          </span>
        )}
      </Col>

    </Row>
  );
}