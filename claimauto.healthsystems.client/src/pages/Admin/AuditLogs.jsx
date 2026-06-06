import { useEffect, useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { getAllAuditLogs } from '../../services/auditlogs/auditLogService';
import {
  generateAuditPackage,
  getAuditPackagePdf,
} from '../../services/reports/reportService';
import {
  getErrors,
  subscribeErrors,
  dismissError,
  clearAllErrors,
} from '../../services/errorLogService';
import AuditLogTable       from '../../components/auditlogs/AuditLogTable';
import AuditLogFilters     from '../../components/auditlogs/AuditLogFilters';
import AuditLogDetailModal from '../../components/auditlogs/AuditLogDetailModal';

const PAGE_SIZE = 20;

// Returns an array of page numbers and '...' separators for the nav bar
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) result.push('...');
  }
  return result;
}

function toAuditLogDownload(log) {
  return {
    auditID: log.auditID,
    userID: log.userID,
    userName: log.userName,
    action: log.action,
    resourceType: log.resourceType,
    resourceID: log.resourceID,
    resourceLabel: log.resourceLabel,
    details: log.parsedDetails,
    detailsJSON: log.detailsJSON,
    timestamp: log.timestamp?.toISOString?.() ?? null,
    absoluteTime: log.absoluteTime,
  };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function filenameStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default function AuditLogs() {
  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedLog,   setSelectedLog]   = useState(null);
  const [currentPage,   setCurrentPage]   = useState(1);

  // ── Session Error Log — live-captures API errors from axiosClient ──
  const [sessionErrors, setSessionErrors] = useState(getErrors);

  useEffect(() => {
    const unsub = subscribeErrors(setSessionErrors);
    return unsub;
  }, []);

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
      setCurrentPage(1);          // reset to first page on every new fetch
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

  // ── Client-side userName filter (API doesn't expose name search) ──────
  const nameFiltered = activeFilters.userName
    ? logs.filter((l) =>
        l.userName?.toLowerCase().includes(activeFilters.userName.toLowerCase())
      )
    : logs;

  // ── Pagination derived values ─────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(nameFiltered.length / PAGE_SIZE));
  const safeePage  = Math.min(currentPage, totalPages);
  const startIdx   = (safeePage - 1) * PAGE_SIZE;
  const endIdx     = Math.min(startIdx + PAGE_SIZE, nameFiltered.length);
  const pagedLogs  = nameFiltered.slice(startIdx, endIdx);

  function handleDownloadLogs() {
    downloadJson(`ClaimAuto-AuditLogs-${filenameStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      count: nameFiltered.length,
      filters: activeFilters,
      logs: nameFiltered.map(toAuditLogDownload),
    });
  }

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

      {/* ── Page header — gradient banner ─────────────────────── */}
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding:      '22px 28px',
          boxShadow:    '0 8px 32px rgba(102,126,234,0.35)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -40, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -50, left: '38%', pointerEvents: 'none' }} />

        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ position: 'relative' }}
        >
          {/* Left: icon + title */}
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: 50, height: 50, borderRadius: 14,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <i className="bi bi-journal-text" style={{ fontSize: '1.4rem', color: 'white' }}></i>
            </div>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: 'white', letterSpacing: '-0.3px' }}>
                Audit Logs
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                Admin-only &nbsp;·&nbsp; Full activity trail &nbsp;·&nbsp;
                {!loading && (
                  <strong style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {' '}{nameFiltered.length.toLocaleString()} entr{nameFiltered.length === 1 ? 'y' : 'ies'}
                  </strong>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="d-flex gap-2">
            <button
              onClick={handleDownloadLogs}
              disabled={loading || nameFiltered.length === 0}
              style={{
                padding:      '7px 16px',
                borderRadius: 10,
                border:       '1.5px solid rgba(255,255,255,0.35)',
                background:   'rgba(255,255,255,0.18)',
                color:        'white',
                fontSize:     '0.82rem',
                fontWeight:   600,
                cursor:       loading || nameFiltered.length === 0 ? 'not-allowed' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                backdropFilter: 'blur(8px)',
                opacity:      loading || nameFiltered.length === 0 ? 0.55 : 1,
                transition:   'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!loading && nameFiltered.length > 0) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.28)';
                }
              }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            >
              <i className="bi bi-download"></i>
              Download Logs
            </button>

            <button
              onClick={openPkgCard}
              style={{
                padding:      '7px 16px',
                borderRadius: 10,
                border:       '1.5px solid rgba(255,255,255,0.35)',
                background:   'rgba(255,255,255,0.18)',
                color:        'white',
                fontSize:     '0.82rem',
                fontWeight:   600,
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                backdropFilter: 'blur(8px)',
                transition:   'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            >
              <i className="bi bi-file-earmark-zip"></i>
              Audit Package
            </button>

            <button
              onClick={() => fetchLogs(activeFilters)}
              disabled={loading}
              style={{
                padding:      '7px 14px',
                borderRadius: 10,
                border:       '1.5px solid rgba(255,255,255,0.35)',
                background:   'rgba(255,255,255,0.14)',
                color:        'white',
                fontSize:     '0.82rem',
                fontWeight:   600,
                cursor:       loading ? 'not-allowed' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                backdropFilter: 'blur(8px)',
                opacity:      loading ? 0.6 : 1,
                transition:   'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            >
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`}></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Session Error Log ─────────────────────────────────── */}
      {sessionErrors.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            marginBottom: 20,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ color: 'white', fontSize: 12 }}></i>
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.3px' }}>
                Session Error Log
              </span>
              <span style={{
                background: 'rgba(255,255,255,0.22)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 8px',
                borderRadius: 20,
              }}>
                {sessionErrors.length} event{sessionErrors.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={clearAllErrors}
              title="Clear all session errors"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <i className="bi bi-trash3"></i> Clear All
            </button>
          </div>

          {/* Error rows */}
          <div style={{ padding: '10px 0', maxHeight: 280, overflowY: 'auto' }}>
            {sessionErrors.map((err) => (
              <div
                key={err.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '8px 18px',
                  borderBottom: '1px solid #fef2f2',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Status badge */}
                <div style={{
                  minWidth: 42,
                  textAlign: 'center',
                  padding: '2px 0',
                  borderRadius: 6,
                  background: err.status >= 500 ? '#fee2e2' : '#fff7ed',
                  border: `1px solid ${err.status >= 500 ? '#fecaca' : '#fed7aa'}`,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: err.status >= 500 ? '#dc2626' : '#ea580c',
                  flexShrink: 0,
                }}>
                  {err.status ?? '—'}
                </div>

                {/* Method + URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>
                    <span style={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: 4,
                      marginRight: 6,
                      fontFamily: 'monospace',
                    }}>
                      {err.method}
                    </span>
                    <span style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: '0.75rem' }}>
                      {err.url}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {err.message}
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0, paddingTop: 2 }}>
                  {new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => dismissError(err.id)}
                  title="Dismiss this error"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '0 2px',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div style={{
            padding: '6px 18px',
            background: '#fef9f9',
            borderTop: '1px solid #fee2e2',
            fontSize: '0.7rem',
            color: '#9ca3af',
          }}>
            <i className="bi bi-info-circle me-1"></i>
            Session-only · Errors are captured from API calls in this browser session and cleared on page refresh.
          </div>
        </div>
      )}

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
          {nameFiltered.length > 0 ? (
            <>
              Showing <strong>{startIdx + 1}–{endIdx}</strong> of{' '}
              <strong>{nameFiltered.length}</strong> log{nameFiltered.length !== 1 ? 's' : ''}
              {filterSummary
                ? <> &mdash; {filterSummary}</>
                : <> &mdash; newest first.</>}
            </>
          ) : (
            <>No logs found{filterSummary ? ` — ${filterSummary}` : '.'}</>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <AuditLogTable
            logs={pagedLogs}
            loading={loading}
            error={error}
            onViewLog={handleViewLog}
          />
        </Card.Body>
      </Card>

      {/* ── Pagination controls ───────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1"
        >
          {/* Left: page info */}
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}
            <strong>{nameFiltered.length}</strong> total log{nameFiltered.length !== 1 ? 's' : ''}
          </div>

          {/* Right: page buttons */}
          <div className="d-flex align-items-center gap-1">

            {/* Previous */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeePage === 1}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: safeePage === 1 ? '#f8fafc' : 'white',
                color: safeePage === 1 ? '#cbd5e1' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: safeePage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="bi bi-chevron-left me-1"></i>Prev
            </button>

            {/* Page numbers */}
            {getPageNumbers(safeePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: 36,
                    height: 34,
                    borderRadius: 8,
                    border: safeePage === p ? 'none' : '1px solid #e2e8f0',
                    background:
                      safeePage === p
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'white',
                    color: safeePage === p ? 'white' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: safeePage === p ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: safeePage === p
                      ? '0 2px 8px rgba(102,126,234,0.35)' : 'none',
                  }}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeePage === totalPages}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: safeePage === totalPages ? '#f8fafc' : 'white',
                color: safeePage === totalPages ? '#cbd5e1' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: safeePage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Next<i className="bi bi-chevron-right ms-1"></i>
            </button>

          </div>
        </div>
      )}

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
  if (filters.userName)     parts.push(`Name: "${filters.userName}"`);
  if (filters.userId)       parts.push(`User #${filters.userId}`);
  if (filters.resourceType) parts.push(`Resource: ${filters.resourceType}`);
  if (filters.action)       parts.push(`Action: ${filters.action}`);
  if (parts.length === 0)   return null;
  return `filtered by ${parts.join(', ')}`;
}
