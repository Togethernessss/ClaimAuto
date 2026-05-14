import { useState } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';

// Common resource types to offer as a dropdown.
// Free-text would also work, but a dropdown is more discoverable for Admin.
const RESOURCE_TYPES = [
  '',           // empty = "All"
  'User',
  'Claim',
  'ClaimLine',
  'ClaimDocument',
  'Policy',
  'Member',
  'Rule',
  'Adjudication',
  'Payment',
  'Appeal',
  'Notification',
  'Task',
  'FraudCase',
];

const LIMIT_OPTIONS = [50, 100, 250, 500, 1000];

// Props:
//   onSearch(filters)  — called when user clicks Search
//   onClear()          — called when user clicks Clear
//   loading            — disables the buttons while a fetch is in progress
export default function AuditLogFilters({ onSearch, onClear, loading }) {
  // Local state — these are JUST the form inputs.
  // We don't fetch anything here; that's the parent's job.
  const [userId, setUserId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [limit, setLimit] = useState(500);

  // When user clicks Search, build the filter object and hand it up.
  // We trim strings + parse the userId; the service ignores empty values.
  const handleSearch = (e) => {
    e.preventDefault();
    onSearch({
      userId: userId.trim() ? parseInt(userId, 10) : undefined,
      resourceType: resourceType || undefined,
      action: action.trim() || undefined,
      limit,
    });
  };

  // Clear button — reset every field and tell the parent to re-fetch.
  const handleClear = () => {
    setUserId('');
    setResourceType('');
    setAction('');
    setLimit(500);
    onClear();
  };

  return (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body>
        <h6 className="fw-bold text-uppercase text-muted small mb-3">
          <i className="bi bi-funnel-fill me-2"></i> Filters
        </h6>

        <Form onSubmit={handleSearch}>
          <Row className="g-3 align-items-end">
            {/* User ID */}
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold">User ID</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </Form.Group>
            </Col>

            {/* Resource Type dropdown */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Resource Type</Form.Label>
                <Form.Select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t || 'all'} value={t}>
                      {t || 'All'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Action — free text */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Action</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Login, CreateRule"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
              </Form.Group>
            </Col>

            {/* Limit dropdown */}
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Limit</Form.Label>
                <Form.Select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                >
                  {LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Buttons */}
            <Col md={2} className="d-flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-grow-1"
              >
                <i className="bi bi-search me-1"></i> Search
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={handleClear}
                disabled={loading}
                title="Clear filters"
              >
                <i className="bi bi-x-lg"></i>
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}