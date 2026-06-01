import { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import {
  getReconciliations,
  createReconciliation,
  getReconciliationPdf,
} from '../../../../services/payments/paymentService';

export default function ReconciliationTab() {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd,   setPeriodEnd]   = useState('');

  // ── Form is valid only when both dates selected ───────────────
  const isFormValid = periodStart !== '' && periodEnd !== '';

  async function loadRecords() {
    setLoading(true);
    setError(null);
    try {
      const data = await getReconciliations();
      setRecords(data);
    } catch {
      setError('Failed to load reconciliation records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  async function handleGenerate() {
    if (!periodStart || !periodEnd) {
      setGenError('Please select both start and end dates.');
      return;
    }
    if (new Date(periodStart) >= new Date(periodEnd)) {
      setGenError('Start date must be before end date.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      await createReconciliation({
        periodStart: new Date(periodStart).toISOString(),
        periodEnd:   new Date(periodEnd).toISOString(),
      });
      setSuccessMsg('Reconciliation report generated successfully.');
      setPeriodStart('');
      setPeriodEnd('');
      loadRecords();
    } catch {
      setGenError('Failed to generate reconciliation report.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPdf(reconId) {
    setPdfLoading(reconId);
    try {
      const blob = await getReconciliationPdf(reconId);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Reconciliation-REC-${reconId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setPdfLoading(null);
    }
  }

  // ── Only show reconciliations from last 7 days ────────────────
  const recentRecords = records.filter(r => {
    const generatedAt  = new Date(r.reconciledAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return generatedAt >= sevenDaysAgo;
  });

  function parseMetrics(json) {
    try { return JSON.parse(json); }
    catch { return {}; }
  }

  function formatCurrency(val) {
    if (!val) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  return (
    <div>

      {/* ── Generate Form ───────────────────────────────────── */}
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

          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold small">
                Period Start <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setGenError(null);
                }}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold small">
                Period End <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setGenError(null);
                }}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <div className="col-md-4">
              <button
                className="btn fw-semibold text-white w-100"
                onClick={handleGenerate}
                disabled={!isFormValid || generating}
                style={{
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 8,
                  opacity: isFormValid ? 1 : 0.45,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
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
          </div>
        </Card.Body>
      </Card>

      {/* ── Past Reconciliations ────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="text-muted small mt-2">
                Loading records...
              </div>
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="danger"
                className="d-flex align-items-center mb-0">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </Alert>
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-data"
                style={{ fontSize: 48, color: '#dfe4ea' }}></i>
              <div className="fw-semibold text-muted mt-3">
                No reconciliations in the last 7 days
              </div>
              <div className="small text-muted mt-1">
                Select a date range above to generate a new report.
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
                    <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">
                      Period
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Total Payments
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Total Amount
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Discrepancies
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Generated By
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Generated At
                    </th>
                    <th className="py-3 text-muted small fw-semibold text-uppercase pe-4">
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r) => {
                    const metrics       = parseMetrics(
                      r.paymentsSummaryJSON);
                    const discrepancies = parseMetrics(
                      r.discrepanciesJSON);
                    return (
                      <tr key={r.reconID}>
                        <td className="ps-4 py-3">
                          <div className="fw-semibold"
                            style={{ fontSize: 13 }}>
                            {formatDate(r.periodStart)}
                          </div>
                          <div className="text-muted"
                            style={{ fontSize: 11 }}>
                            to {formatDate(r.periodEnd)}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="fw-semibold">
                            {metrics.totalPayments ?? '—'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="fw-semibold"
                            style={{ color: '#764ba2' }}>
                            {formatCurrency(metrics.totalAmount)}
                          </span>
                        </td>
                        <td className="py-3">
                          {discrepancies.count === 0 ? (
                            <Badge bg="success"
                              style={{ fontSize: 11 }}>
                              ✓ None
                            </Badge>
                          ) : (
                            <Badge bg="danger"
                              style={{ fontSize: 11 }}>
                              ⚠ {discrepancies.count}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-muted"
                          style={{ fontSize: 13 }}>
                          {r.performedByName ?? 'System'}
                        </td>
                        <td className="py-3 text-muted"
                          style={{ fontSize: 12 }}>
                          {formatDate(r.reconciledAt)}
                        </td>
                        <td className="py-3 pe-4">
                          <button
                            className="btn btn-sm"
                            onClick={() =>
                              handleDownloadPdf(r.reconID)}
                            disabled={pdfLoading === r.reconID}
                            style={{
                              background: '#d1f2eb',
                              color: '#085041',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {pdfLoading === r.reconID ? (
                              <Spinner animation="border"
                                size="sm" />
                            ) : (
                              <>
                                <i className="bi bi-file-pdf me-1"></i>
                                Download
                              </>
                            )}
                          </button>
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
  );
}