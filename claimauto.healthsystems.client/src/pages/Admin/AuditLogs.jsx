import { useEffect, useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { getAllAuditLogs } from '../../services/auditlogs/auditLogService';
import {
  generateAuditPackage,
  getAuditPackagePdf,
} from '../../services/reports/reportService';
import AuditLogTable       from '../../components/auditlogs/AuditLogTable';
import AuditLogFilters     from '../../components/auditlogs/AuditLogFilters';
import AuditLogDetailModal from '../../components/auditlogs/AuditLogDetailModal';

export default function AuditLogs() {
  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedLog,   setSelectedLog]   = useState(null);

  // ── Audit Package state ───────────────────────────────────────
  const [showPkgCard,   setShowPkgCard]   = useState(false);
  const [pkgStart,      setPkgStart]      = useState('');
  const [pkgEnd,        setPkgEnd]        = useState('');
  const [pkgGenerating, setPkgGenerating] = useState(false);
  const [pkgError,      setPkgError]      = useState(null);
  const [pkgSuccess,    setPkgSuccess]    = useState(null);

  const isPkgFormValid = pkgStart !== '' && pkgEnd !== '';

  useEffect(() => { fetchLogs({}); }, []);

  // ── Auto-clear success ────────────────────────────────────────
  useEffect(() => {
    if (!pkgSuccess) return;
    const t = setTimeout(() => setPkgSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [pkgSuccess]);

  const fetchLogs = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAuditLogs(filters);
      setLogs(data);
      setActiveFilters(filters);
    } catch (err) {
      const apiMsg = err.response?.data?.message
        || err.response?.data
        || 'Failed to load audit logs.';
      setError(
        typeof apiMsg === 'string'
          ? apiMsg : 'Failed to load audit logs.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch    = (f) => fetchLogs(f);
  const handleClear     = ()  => fetchLogs({});
  const handleViewLog   = (l) => setSelectedLog(l);
  const handleCloseModal= ()  => setSelectedLog(null);

  function openPkgCard() {
    setPkgStart('');
    setPkgEnd('');
    setPkgError(null);
    setPkgSuccess(null);
    setShowPkgCard(true);
  }

  function closePkgCard() {
    setShowPkgCard(false);
  }

  async function handleGeneratePackage() {
    if (!pkgStart || !pkgEnd) {
      setPkgError('Please select both start and end dates.');
      return;
    }
    if (new Date(pkgStart) >= new Date(pkgEnd)) {
      setPkgError('Start date must be before end date.');
      return;
    }
    setPkgGenerating(true);
    setPkgError(null);
    try {
      const pkg = await generateAuditPackage(
        new Date(pkgStart).toISOString(),
        new Date(pkgEnd).toISOString()
      );

      if (pkg.hasPDF) {
        const blob = await getAuditPackagePdf(pkg.packageID);
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `AuditPackage-PKG-${pkg.packageID}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      setPkgSuccess(
        `Audit Package #PKG-${pkg.packageID} generated and downloaded successfully.`
      );
      setPkgStart('');
      setPkgEnd('');
    } catch {
      setPkgError(
        'Failed to generate audit package. Please try again.');
    } finally {
      setPkgGenerating(false);
    }
  }

  const filterSummary = buildFilterSummary(activeFilters);

  return (
    <Container fluid>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      {showPkgCard && (
        <div
          onClick={closePkgCard}
          style={{
            position:        'fixed',
            inset:           0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex:          1040,
          }}
        />
      )}

      {/* ── Audit Package floating card ───────────────────────── */}
      {showPkgCard && (
        <div style={{
          position:     'fixed',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          zIndex:       1050,
          width:        '100%',
          maxWidth:     560,
          padding:      '0 16px',
        }}>
          <div style={{
            background:   '#ffffff',
            borderRadius: 12,
            boxShadow:    '0 20px 60px rgba(0,0,0,0.25)',
            overflow:     'hidden',
          }}>
            {/* ── Card header ──────────────────────────────────── */}
            <div style={{
              background:     'linear-gradient(135deg, ' +
                              '#667eea 0%, #764ba2 100%)',
              padding:        '16px 20px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
            }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-zip"
                  style={{ fontSize: 20, color: '#ffffff' }}></i>
                <div>
                  <div style={{
                    fontWeight: 700,
                    fontSize:   15,
                    color:      '#ffffff',
                  }}>
                    Generate Compliance Audit Package
                  </div>
                  <div style={{
                    fontSize: 11,
                    color:    '#ffffff99',
                  }}>
                    Admin only · PDF auto-downloads
                  </div>
                </div>
              </div>
              {/* ── Close button ─────────────────────────────── */}
              <button
                onClick={closePkgCard}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border:     'none',
                  borderRadius: '50%',
                  width:      32,
                  height:     32,
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor:     'pointer',
                  color:      '#ffffff',
                  fontSize:   16,
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* ── Card body ─────────────────────────────────────── */}
            <div style={{ padding: '20px' }}>
              <p className="text-muted mb-4"
                style={{ fontSize: 13 }}>
                Generate a full compliance PDF covering claims,
                payments, adjudication, fraud, KPIs and audit
                activity for the selected period.
              </p>

              {pkgError && (
                <Alert variant="danger"
                  className="d-flex align-items-center
                    py-2 mb-3">
                  <i className="bi bi-exclamation-triangle-fill
                    me-2"></i>
                  {pkgError}
                </Alert>
              )}

              {pkgSuccess && (
                <Alert variant="success"
                  className="d-flex align-items-center
                    py-2 mb-3">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {pkgSuccess}
                </Alert>
              )}

              <div className="row g-3 align-items-end mb-4">
                <div className="col-6">
                  <label className="form-label fw-semibold small">
                    Period Start{' '}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={pkgStart}
                    onChange={(e) => {
                      setPkgStart(e.target.value);
                      setPkgError(null);
                    }}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">
                    Period End{' '}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={pkgEnd}
                    onChange={(e) => {
                      setPkgEnd(e.target.value);
                      setPkgError(null);
                    }}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <button
                className="btn fw-semibold text-white w-100"
                onClick={handleGeneratePackage}
                disabled={!isPkgFormValid || pkgGenerating}
                style={{
                  background:
                    'linear-gradient(135deg, ' +
                    '#667eea 0%, #764ba2 100%)',
                  border:     'none',
                  borderRadius: 8,
                  padding:    '10px',
                  fontSize:   14,
                  opacity:    isPkgFormValid ? 1 : 0.45,
                  cursor:     isPkgFormValid
                    ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s',
                }}
              >
                {pkgGenerating ? (
                  <>
                    <Spinner animation="border" size="sm"
                      className="me-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-2"></i>
                    Generate & Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4">
        <i className="bi bi-journal-text fs-2 text-primary me-3"></i>
        <div className="flex-grow-1">
          <h3 className="fw-bold mb-0">Audit Logs</h3>
          <small className="text-muted">
            Admin-only — full activity trail of every action
            in ClaimAuto
          </small>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm fw-semibold text-white"
            onClick={openPkgCard}
            style={{
              background:
                'linear-gradient(135deg, ' +
                '#667eea 0%, #764ba2 100%)',
              border:       'none',
              borderRadius: 8,
              fontSize:     13,
            }}
          >
            <i className="bi bi-file-earmark-zip me-1"></i>
            Audit Package
          </button>

          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => fetchLogs(activeFilters)}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise me-1`}></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <AuditLogFilters
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
      />

      {/* ── Result count ──────────────────────────────────────── */}
      {!loading && !error && (
        <div className="mb-3 small text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Showing <strong>{logs.length}</strong> log
          {logs.length !== 1 ? 's' : ''}
          {filterSummary
            ? <> &mdash; {filterSummary}</>
            : <> &mdash; newest first.</>}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
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

      {/* ── Detail modal ──────────────────────────────────────── */}
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
  if (filters.userId)       parts.push(`User #${filters.userId}`);
  if (filters.resourceType) parts.push(`Resource: ${filters.resourceType}`);
  if (filters.action)       parts.push(`Action: ${filters.action}`);
  if (parts.length === 0)   return null;
  return `filtered by ${parts.join(', ')}`;
}