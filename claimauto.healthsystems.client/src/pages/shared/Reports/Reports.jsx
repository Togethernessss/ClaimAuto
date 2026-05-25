import { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Alert } from 'react-bootstrap';
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

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-4 pt-3 mb-4">
        <div className="d-flex align-items-center
          justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center">
            <i className="bi bi-bar-chart-line fs-2
              text-primary me-3"></i>
            <div>
              <h3 className="fw-bold mb-0">Reports</h3>
              <small className="text-muted">
                Generate and download system reports ·
                showing last 3 days
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">

        {/* ── Generate Section ─────────────────────────────────── */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>

            {genError && (
              <Alert variant="danger"
                className="d-flex align-items-center py-2 mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {genError}
              </Alert>
            )}

            {successMsg && (
              <Alert variant="success"
                className="d-flex align-items-center py-2 mb-3">
                <i className="bi bi-check-circle-fill me-2"></i>
                {successMsg}
              </Alert>
            )}

            {pdfError && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setPdfError(null)}
                className="d-flex align-items-center py-2 mb-3"
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {pdfError}
              </Alert>
            )}

            <div className="row g-3 align-items-end">

              {/* ── Scope dropdown ──────────────────────────── */}
              <div className="col-md-4">
                <label className="form-label fw-semibold small">
                  Report Scope{' '}
                  <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    setGenError(null);
                  }}
                  style={{ borderRadius: 8, fontSize: 13 }}
                >
                  <option value="">— Select scope —</option>
                  <option value="Operational">Operational</option>
                  <option value="Financial">Financial</option>
                  <option value="Fraud">Fraud</option>
                  <option value="Regulatory">Regulatory</option>
                </select>
              </div>

              {/* ── Generate button ──────────────────────────── */}
              <div className="col-md-4">
                <button
                  className="btn fw-semibold text-white w-100"
                  onClick={handleGenerate}
                  disabled={!isFormValid || generating}
                  style={{
                    background:
                      'linear-gradient(135deg, ' +
                      '#667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 8,
                    opacity: isFormValid ? 1 : 0.45,
                    cursor: isFormValid
                      ? 'pointer' : 'not-allowed',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {generating ? (
                    <>
                      <Spinner animation="border" size="sm"
                        className="me-1" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg me-1"></i>
                      Generate Report
                    </>
                  )}
                </button>
              </div>

              {/* ── Scope description below ──────────────────── */}
              {scope && (
                <div className="col-12">
                  <small className="text-muted"
                    style={{ fontSize: 11 }}>
                    {scopeDescription(scope)}
                  </small>
                </div>
              )}

            </div>
          </Card.Body>
        </Card>

        {/* ── Past Reports Table ───────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <div className="text-muted small mt-2">
                  Loading reports...
                </div>
              </div>
            ) : error ? (
              <div className="p-4">
                <Alert variant="danger"
                  className="d-flex align-items-center mb-0">
                  <i className="bi bi-exclamation-triangle-fill
                    me-2"></i>
                  {error}
                </Alert>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bar-chart-line"
                  style={{ fontSize: 48, color: '#dfe4ea' }}>
                </i>
                <div className="fw-semibold text-muted mt-3">
                  No reports in the last 3 days
                </div>
                <div className="small text-muted mt-1">
                  Select a scope above to generate your
                  first report.
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #dee2e6',
                  }}>
                    <tr>
                      <th className="ps-4 py-3 text-muted small
                        fw-semibold text-uppercase">
                        Report ID
                      </th>
                      <th className="py-3 text-muted small
                        fw-semibold text-uppercase">
                        Scope
                      </th>
                      <th className="py-3 text-muted small
                        fw-semibold text-uppercase">
                        Generated By
                      </th>
                      <th className="py-3 text-muted small
                        fw-semibold text-uppercase">
                        Generated At
                      </th>
                      <th className="py-3 text-muted small
                        fw-semibold text-uppercase pe-4">
                        PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((r) => {
                      const s = scopeStyle(r.scope);
                      return (
                        <tr key={r.reportID}>
                          <td className="ps-4 py-3">
                            <span className="font-monospace
                              fw-semibold"
                              style={{ fontSize: 13 }}>
                              #RPT-{r.reportID}
                            </span>
                          </td>
                          <td className="py-3">
                            <span style={{
                              background: s.bg,
                              color: s.color,
                              padding: '3px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}>
                              {r.scope}
                            </span>
                          </td>
                          <td className="py-3 text-muted"
                            style={{ fontSize: 13 }}>
                            {r.generatedByName}
                          </td>
                          <td className="py-3 text-muted"
                            style={{ fontSize: 12 }}>
                            {formatDate(r.generatedAt)}
                          </td>
                          <td className="py-3 pe-4">
                            {r.hasPDF ? (
                              <button
                                className="btn btn-sm"
                                onClick={() =>
                                  handleDownloadPdf(
                                    r.reportID, r.scope)}
                                disabled={
                                  pdfLoading === r.reportID}
                                style={{
                                  background: '#d1f2eb',
                                  color: '#085041',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {pdfLoading === r.reportID ? (
                                  <Spinner
                                    animation="border"
                                    size="sm" />
                                ) : (
                                  <>
                                    <i className="bi bi-file-pdf
                                      me-1"></i>
                                    Download
                                  </>
                                )}
                              </button>
                            ) : (
                              <span style={{
                                fontSize: 12,
                                color: '#9e9e9e',
                              }}>
                                No file
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}