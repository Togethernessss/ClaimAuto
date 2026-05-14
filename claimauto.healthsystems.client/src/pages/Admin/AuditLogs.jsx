import { useEffect, useState } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { getAllAuditLogs } from '../../services/auditlogs/auditLogService';
import AuditLogTable from '../../components/auditlogs/AuditLogTable';
import AuditLogFilters from '../../components/auditlogs/AuditLogFilters';
import AuditLogDetailModal from '../../components/auditlogs/AuditLogDetailModal';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  // Modal state — null = closed, log instance = open + showing that log
  const [selectedLog, setSelectedLog] = useState(null);

  // Initial fetch on mount
  useEffect(() => {
    fetchLogs({});
  }, []);

  const fetchLogs = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAuditLogs(filters);
      setLogs(data);
      setActiveFilters(filters);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Failed to load audit logs.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters) => fetchLogs(filters);
  const handleClear = () => fetchLogs({});

  // Modal open/close handlers
  const handleViewLog = (log) => setSelectedLog(log);
  const handleCloseModal = () => setSelectedLog(null);

  const filterSummary = buildFilterSummary(activeFilters);

  return (
    <Container fluid>
      
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4">
        <i className="bi bi-journal-text fs-2 text-primary me-3"></i>
        <div className="flex-grow-1">
          <h3 className="fw-bold mb-0">Audit Logs</h3>
          <small className="text-muted">
            Admin-only — full activity trail of every action in ClaimAuto
          </small>
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => fetchLogs(activeFilters)}
          disabled={loading}
          title="Refresh with current filters"
        >
          <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spinner' : ''}`}></i>
          Refresh
        </Button>
      </div>
      {/*Filter card */}
      <AuditLogFilters
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
      />

      {/*Result count*/}
      {!loading && !error && (
        <div className="mb-3 small text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Showing <strong>{logs.length}</strong> log{logs.length !== 1 ? 's' : ''}
          {filterSummary
            ? <> &mdash; {filterSummary}</>
            : <> &mdash; newest first.</>}
        </div>
      )}

      {/* ── The table card ──────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <AuditLogTable
            logs={logs}
            loading={loading}
            error={error}
            onViewLog={handleViewLog}
          />
        </Card.Body>
      </Card>

      {/* ── Details modal ───────────────────────────────────── */}
      <AuditLogDetailModal
        show={selectedLog !== null}
        log={selectedLog}
        onClose={handleCloseModal}
      />
    </Container>
  );
}

function buildFilterSummary(filters) {
  const parts = [];
  if (filters.userId) parts.push(`User #${filters.userId}`);
  if (filters.resourceType) parts.push(`Resource: ${filters.resourceType}`);
  if (filters.action) parts.push(`Action: ${filters.action}`);
  if (parts.length === 0) return null;
  return `filtered by ${parts.join(', ')}`;
}