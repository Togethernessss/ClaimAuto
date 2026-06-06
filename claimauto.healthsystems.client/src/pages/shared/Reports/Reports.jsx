import { useState, useEffect } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import {
  getAllReports,
  generateReport,
  getReportPdf,
} from '../../../services/reports/reportService';

// ── Scope badge color ─────────────────────────────────────────
function scopeStyle(scope) {
  switch (scope) {
    case 'Operational': return { bg: '#e3f2fd', color: '#0d6efd' };
    case 'Financial':   return { bg: '#dcfce7', color: '#22c55e' };
    case 'Fraud':       return { bg: '#fee2e2', color: '#ef4444' };
    case 'Regulatory':  return { bg: '#f3f0ff', color: '#764ba2' };
    default:            return { bg: '#f3f4f6', color: '#9e9e9e' };
  }
}

function scopeIcon(scope) {
  switch (scope) {
    case 'Operational': return 'bi-gear-fill';
    case 'Financial':   return 'bi-cash-coin';
    case 'Fraud':       return 'bi-shield-exclamation';
    case 'Regulatory':  return 'bi-clipboard-check-fill';
    default:            return 'bi-file-earmark-text';
  }
}

// ── Scope description ─────────────────────────────────────────
function scopeDescription(scope) {
  switch (scope) {
    case 'Operational':
      return 'Claims processing — auto-adjudication, denial rates';
    case 'Financial':
      return 'Payment totals — executed, pending amounts';
    case 'Fraud':
      return 'Fraud detection — scores, cases, resolution';
    case 'Regulatory':
      return 'Compliance — audit logs, adjudication records';
    default:
      return '';
  }
}

// ── Pagination ────────────────────────────────────────────────
const PAGE_SIZE = 15;

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

// ── Format date only — UTC to IST ────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const utc    = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const ist    = new Date(utc.getTime() + 330 * 60 * 1000);
  const day    = String(ist.getUTCDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const month  = months[ist.getUTCMonth()];
  const year   = ist.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export default function Reports() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [scope,      setScope]      = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [pdfError,   setPdfError]   = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Form valid only when scope selected ──────────────────────
  const isFormValid = scope !== '';

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllReports();
      setReports(data);
    } catch {
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, []);

  useEffect(() => { setCurrentPage(1); }, [reports]);

  // ── Auto-clear success ────────────────────────────────────────
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Only show last 3 days ─────────────────────────────────────
  const recentReports = reports.filter(r => {
    const generatedAt  = new Date(r.generatedAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return generatedAt >= threeDaysAgo;
  });

  const totalPages   = Math.max(1, Math.ceil(recentReports.length / PAGE_SIZE));
  const safeePage    = Math.min(currentPage, totalPages);
  const startIdx     = (safeePage - 1) * PAGE_SIZE;
  const endIdx       = Math.min(startIdx + PAGE_SIZE, recentReports.length);
  const pagedReports = recentReports.slice(startIdx, endIdx);

  async function handleGenerate() {
    if (!scope) {
      setGenError('Please select a report scope.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      await generateReport(scope);
      setSuccessMsg(`${scope} report generated successfully.`);
      setScope('');
      loadReports();
    } catch {
      setGenError('Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPdf(reportId, reportScope) {
    setPdfLoading(reportId);
    try {
      const blob = await getReportPdf(reportId);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Report-RPT-${reportId}-${reportScope}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setPdfError('Could not download the PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <Container fluid className="p-0">

      {/* ── Gradient Banner Header ─────────────────────────────── */}
      <div className="px-4 pt-3 mb-4">
        <div
          className="position-relative overflow-hidden"
          style={{
            borderRadius: 18,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '22px 28px',
            boxShadow: '0 8px 32px rgba(102,126,234,0.35)',
          }}
        >
          {/* Decorative orbs */}
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -40, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -40, right: 160, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            {/* Icon box */}
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <i className="bi bi-bar-chart-line" style={{ fontSize: '1.4rem', color: 'white' }}></i>
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 800, margin: 0, fontSize: '1.3rem' }}>
                Reports
              </h4>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>
                Generate and download system reports · showing last 3 days
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">

        {/* ── Generate Section ─────────────────────────────────── */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          {/* Section header bar */}
          <div style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            padding: '14px 20px',
            borderBottom: '1px solid #ede9fe',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="bi bi-plus-circle-fill" style={{ color: 'white', fontSize: 14 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#4c1d95', fontSize: '0.9rem' }}>
                Generate New Report
              </div>
              <div style={{ fontSize: '0.73rem', color: '#7c3aed', opacity: 0.8 }}>
                Select a scope and generate an on-demand report
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>

            {/* ── Messages ───────────────────────────────────────── */}
            {genError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff5f5', border: '1px solid #fca5a5',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: 14, flexShrink: 0 }}></i>
                <span style={{ color: '#dc2626', fontSize: '0.83rem' }}>{genError}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              }}>
                <i className="bi bi-check-circle-fill" style={{ color: '#16a34a', fontSize: 14, flexShrink: 0 }}></i>
                <span style={{ color: '#16a34a', fontSize: '0.83rem' }}>{successMsg}</span>
              </div>
            )}

            {pdfError && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                background: '#fff5f5', border: '1px solid #fca5a5',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: 14 }}></i>
                  <span style={{ color: '#dc2626', fontSize: '0.83rem' }}>{pdfError}</span>
                </div>
                <button onClick={() => setPdfError(null)} style={{
                  background: 'none', border: 'none', color: '#dc2626',
                  cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0,
                }}>✕</button>
              </div>
            )}

            {/* ── Scope cards + generate ─────────────────────────── */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>

              {/* Scope select */}
              <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: '#4c1d95', marginBottom: 6, letterSpacing: '0.03em',
                }}>
                  Report Scope <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={scope}
                  onChange={(e) => { setScope(e.target.value); setGenError(null); }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: scope ? '1.5px solid #a78bfa' : '1.5px solid #e5e7eb',
                    borderRadius: 10, fontSize: '0.85rem',
                    background: scope ? '#faf5ff' : '#f9fafb',
                    color: scope ? '#4c1d95' : '#9ca3af',
                    outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                    fontWeight: scope ? 600 : 400,
                  }}
                >
                  <option value="">— Select scope —</option>
                  <option value="Operational">Operational</option>
                  <option value="Financial">Financial</option>
                  <option value="Fraud">Fraud</option>
                  <option value="Regulatory">Regulatory</option>
                </select>
                {scope && (
                  <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: 5 }}>
                    <i className={`bi ${scopeIcon(scope)} me-1`}></i>
                    {scopeDescription(scope)}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={handleGenerate}
                  disabled={!isFormValid || generating}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: isFormValid
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#e5e7eb',
                    color: isFormValid ? 'white' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isFormValid && !generating ? 'pointer' : 'not-allowed',
                    transition: 'opacity 0.2s, transform 0.15s',
                    boxShadow: isFormValid ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 7,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (isFormValid && !generating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {generating ? (
                    <>
                      <Spinner animation="border" size="sm" style={{ width: 14, height: 14 }} />
                      Generating...
                    </>
                  ) : (
                    <><i className="bi bi-plus-lg"></i>Generate Report</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Past Reports Table ───────────────────────────────── */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
          overflow: 'hidden',
        }}>
          {/* Section header bar */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              <i className="bi bi-clock-history me-2"></i>Recent Reports
            </span>
            {!loading && !error && (
              <span style={{
                background: 'rgba(255,255,255,0.2)', color: 'white',
                fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              }}>
                {recentReports.length} report{recentReports.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Spinner animation="border" variant="light" size="sm" />
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading reports…</div>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff5f5', margin: 16,
              border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px',
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }}></i>
              <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>
            </div>
          ) : recentReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
                border: '2px solid #ede9fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <i className="bi bi-bar-chart-line" style={{ fontSize: '1.6rem', color: '#7c3aed' }}></i>
              </div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No reports in the last 3 days</div>
              <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Select a scope above to generate your first report.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '130px 150px 1fr 130px 120px',
                background: '#f9fafb',
                padding: '10px 20px',
                borderBottom: '1px solid #f3f0ff',
              }}>
                {['Report ID', 'Scope', 'Generated By', 'Generated At', 'PDF'].map((h) => (
                  <div key={h} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Table rows */}
              {pagedReports.map((r, index) => {
                const s = scopeStyle(r.scope);
                return (
                  <div
                    key={r.reportID}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '130px 150px 1fr 130px 120px',
                      padding: '13px 20px',
                      borderBottom: index < pagedReports.length - 1 ? '1px solid #f3f0ff' : 'none',
                      alignItems: 'center',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#faf9ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Report ID */}
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1e1b4b' }}>
                      #RPT-{r.reportID}
                    </div>
                    {/* Scope */}
                    <div>
                      <span style={{
                        background: s.bg, color: s.color,
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                        <i className={`bi ${scopeIcon(r.scope)}`} style={{ fontSize: '0.65rem' }}></i>
                        {r.scope}
                      </span>
                    </div>
                    {/* Generated By */}
                    <div style={{ fontSize: '0.83rem', color: '#374151' }}>
                      <i className="bi bi-person me-1" style={{ color: '#9ca3af', fontSize: '0.75rem' }}></i>
                      {r.generatedByName}
                    </div>
                    {/* Generated At */}
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      <i className="bi bi-calendar3 me-1" style={{ fontSize: '0.65rem' }}></i>
                      {formatDate(r.generatedAt)}
                    </div>
                    {/* PDF */}
                    <div>
                      {r.hasPDF ? (
                        <button
                          onClick={() => handleDownloadPdf(r.reportID, r.scope)}
                          disabled={pdfLoading === r.reportID}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 8,
                            border: 'none',
                            background: pdfLoading === r.reportID ? '#f3f4f6' : '#d1fae5',
                            color: pdfLoading === r.reportID ? '#9ca3af' : '#065f46',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: pdfLoading === r.reportID ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { if (pdfLoading !== r.reportID) { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = 'white'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.color = '#065f46'; }}
                        >
                          {pdfLoading === r.reportID ? (
                            <Spinner animation="border" size="sm" style={{ width: 12, height: 12 }} />
                          ) : (
                            <i className="bi bi-file-pdf-fill"></i>
                          )}
                          {pdfLoading === r.reportID ? 'Downloading…' : 'Download'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          <i className="bi bi-dash me-1"></i>No file
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer */}
              <div style={{
                padding: '10px 20px', borderTop: '1px solid #f3f0ff',
                background: '#faf9ff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {recentReports.length} report{recentReports.length !== 1 ? 's' : ''} in the last 3 days
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  <i className="bi bi-clock-history me-1"></i>Sorted by newest first
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────── */}
        {!loading && !error && totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
              {' '}·{' '}
              <strong>{recentReports.length}</strong> total record{recentReports.length !== 1 ? 's' : ''}
            </div>
            <div className="d-flex align-items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeePage === 1}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === 1 ? '#f8fafc' : 'white', color: safeePage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                <i className="bi bi-chevron-left me-1"></i>Prev
              </button>
              {getPageNumbers(safeePage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ width: 36, height: 34, borderRadius: 8, border: safeePage === p ? 'none' : '1px solid #e2e8f0', background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: safeePage === p ? 'white' : '#475569', fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none' }}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeePage === totalPages}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === totalPages ? '#f8fafc' : 'white', color: safeePage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                Next<i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
