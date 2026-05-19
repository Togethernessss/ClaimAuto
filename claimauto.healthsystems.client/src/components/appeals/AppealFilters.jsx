import { Row, Col, Form, InputGroup, Button } from 'react-bootstrap';

export default function AppealFilters({
  search, setSearch,
  statusFilter, setStatusFilter,
  outcomeFilter, setOutcomeFilter,
  totalCount, filteredCount,
}) {
  return (
    <Row className="g-3 mb-4">
      <Col md={5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder="Search by Appeal ID, Claim ID, or Filer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button variant="outline-secondary" onClick={() => setSearch('')}>
              <i className="bi bi-x"></i>
            </Button>
          )}
        </InputGroup>
      </Col>
      <Col md={3}>
        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Filed">Filed</option>
          <option value="UnderReview">Under Review</option>
          <option value="Decided">Decided</option>
          <option value="Withdrawn">Withdrawn</option>
        </Form.Select>
      </Col>
      <Col md={3}>
        <Form.Select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}>
          <option value="All">All Outcomes</option>
          <option value="Overturned">Overturned</option>
          <option value="Upheld">Upheld</option>
          <option value="PartiallyUpheld">Partially Upheld</option>
        </Form.Select>
      </Col>
      <Col className="d-flex align-items-center">
        <small className="text-muted">
          {filteredCount} of {totalCount} appeals
        </small>
      </Col>
    </Row>
  );
}