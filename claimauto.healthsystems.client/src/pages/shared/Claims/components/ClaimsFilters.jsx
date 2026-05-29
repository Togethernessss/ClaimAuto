// src/pages/shared/Claims/components/ClaimsFilters.jsx
import { Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { CLAIM_STATUSES, CLAIM_PRIORITIES, statusLabel } from '../utils/claimHelpers';

export default function ClaimsFilters({
  search,
  statusFilter,
  priorityFilter,
  filteredCount,
  totalCount,
  loading,
  isAdmin,
  isStaff,
  isPolicyholder,   // NEW — controls policyholder-specific UI
  segmentFilter,    // NEW — segment key ('all' | 'approved' | 'inprogress' | 'rejected')
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSegmentReset,   // NEW — clears the active segment when "Clear filters" is clicked
}) {
  // For Policyholder: segment is also an active filter
  const hasFilters = !!search
    || statusFilter !== 'All'
    || priorityFilter !== 'All'
    || (isPolicyholder && segmentFilter !== 'all');

  const handleClearAll = () => {
    onSearchChange('');
    onStatusChange('All');
    onPriorityChange('All');
    if (isPolicyholder) onSegmentReset?.();
  };

  return (
    <Row className="g-3 mb-4 align-items-center">

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {/* Policyholder: full-width (no status dropdown beside it)             */}
      <Col md={isPolicyholder ? 7 : 5}>
        <InputGroup>
          <InputGroup.Text className="bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </InputGroup.Text>
          <Form.Control
            className="border-start-0 ps-0"
            placeholder={
              isPolicyholder
                ? 'Search by claim ID or hospital name…'
                : 'Search by claim ID, member, or provider…'
            }
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

      {/* ── Status filter — hidden for Policyholder (segment handles this) ── */}
      {!isPolicyholder && (
        <Col md={2}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </Form.Select>
        </Col>
      )}

      {/* ── Priority filter — Admin + Staff only ───────────────────────────── */}
      {(isAdmin || isStaff) && (
        <Col md={2}>
          <Form.Select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
          >
            <option value="All">All Priorities</option>
            {CLAIM_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Form.Select>
        </Col>
      )}

      {/* ── Count + clear ──────────────────────────────────────────────────── */}
      <Col className="d-flex align-items-center gap-3">
        {!loading && (
          <span className="text-muted small">
            {filteredCount} of {totalCount}{' '}
            {totalCount === 1 ? 'claim' : 'claims'}
          </span>
        )}
        {hasFilters && (
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-3"
            style={{ fontSize: '0.78rem' }}
            onClick={handleClearAll}
          >
            <i className="bi bi-x me-1"></i>Clear filters
          </button>
        )}
      </Col>

    </Row>
  );
}
