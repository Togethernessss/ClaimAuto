import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../../security/AuthContext';
import { canAccess } from '../../../security/permissions';
import {
  getAllRemittances,
  acknowledgeRemittance,
} from '../../../services/payments/remittanceService';

import RemittanceHeader   from './components/RemittanceHeader';
import RemittanceFilters  from './components/RemittanceFilters';
import RemittanceSummary  from './components/RemittanceSummary';
import RemittanceTable    from './components/RemittanceTable';
import AcknowledgeModal   from './components/AcknowledgeModal';

// ── Default dateFrom — 30 days ago ────────────────────────────
function getThirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

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

export default function Remittance() {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  // ── List state ────────────────────────────────────────────────
  const [remittances, setRemittances] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error,       setError]       = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);
  const [errorMsg,    setErrorMsg]    = useState(null);

  // ── Filter state — default last 30 days ───────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom,     setDateFrom]     = useState(getThirtyDaysAgo());
  const [dateTo,       setDateTo]       = useState('');

  // ── Acknowledge modal state ───────────────────────────────────
  const [showAck,       setShowAck]       = useState(false);
  const [ackTarget,     setAckTarget]     = useState(null);
  const [ackError,      setAckError]      = useState(null);
  const [ackLoading,    setAckLoading]    = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // ── Load remittances ──────────────────────────────────────────
  const loadRemittances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRemittances(
        statusFilter !== 'All' ? statusFilter : null,
        search        || null,
        null,
        dateFrom      || null,
        dateTo        || null,
      );
      setRemittances(data);
    } catch {
      setError('Failed to load remittances.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(() => loadRemittances(), 300);
    return () => clearTimeout(t);
  }, [loadRemittances]);

  // ── Auto-clear toasts ─────────────────────────────────────────
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  // Reset page when remittances data refreshes from server
  useEffect(() => { setCurrentPage(1); }, [remittances]);

  // ── Acknowledge ───────────────────────────────────────────────
  function openAcknowledgeModal(remittance) {
    setAckTarget(remittance);
    setAckError(null);
    setShowAck(true);
  }

  async function handleAcknowledge() {
    setAckLoading(true);
    setActionLoading(ackTarget.paymentID);
    try {
      await acknowledgeRemittance(ackTarget.paymentID);
      setShowAck(false);
      setSuccessMsg(
        `Remittance #REM-${ackTarget.remittanceID} acknowledged successfully.`
      );
      loadRemittances();
    } catch {
      setAckError('Failed to acknowledge remittance. Please try again.');
    } finally {
      setAckLoading(false);
      setActionLoading(null);
    }
  }

  const totalPages       = Math.max(1, Math.ceil(remittances.length / PAGE_SIZE));
  const safeePage        = Math.min(currentPage, totalPages);
  const startIdx         = (safeePage - 1) * PAGE_SIZE;
  const endIdx           = Math.min(startIdx + PAGE_SIZE, remittances.length);
  const pagedRemittances = remittances.slice(startIdx, endIdx);

  // ── Clear filters — resets to default 30 days ─────────────────
  function handleClearFilters() {
    setSearch('');
    setStatusFilter('All');
    setDateFrom(getThirtyDaysAgo());
    setDateTo('');
  }

  return (
    <Container fluid className="p-0">

      <div className="px-4 pt-4">
        <RemittanceHeader
          successMsg={successMsg}
          errorMsg={errorMsg}
        />
      </div>

      <div className="px-4 pb-4">

        {!loading && !error && (
          <RemittanceSummary remittances={remittances} />
        )}

        <RemittanceFilters
          search={search}
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          filteredCount={remittances.length}
          totalCount={remittances.length}
          loading={loading}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearFilters={handleClearFilters}
        />

        <RemittanceTable
          remittances={pagedRemittances}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          onRetry={loadRemittances}
          onOpenAcknowledge={openAcknowledgeModal}
        />

        {!loading && !error && totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
              {' '}·{' '}
              <strong>{remittances.length}</strong> total record{remittances.length !== 1 ? 's' : ''}
            </div>
            <div className="d-flex align-items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeePage === 1}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: safeePage === 1 ? '#f8fafc' : 'white',
                  color: safeePage === 1 ? '#cbd5e1' : '#475569',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: safeePage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease',
                }}
              ><i className="bi bi-chevron-left me-1"></i>Prev</button>
              {getPageNumbers(safeePage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{
                      width: 36, height: 34, borderRadius: 8,
                      border: safeePage === p ? 'none' : '1px solid #e2e8f0',
                      background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                      color: safeePage === p ? 'white' : '#475569',
                      fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none',
                    }}>{p}</button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeePage === totalPages}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: safeePage === totalPages ? '#f8fafc' : 'white',
                  color: safeePage === totalPages ? '#cbd5e1' : '#475569',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: safeePage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease',
                }}
              >Next<i className="bi bi-chevron-right ms-1"></i></button>
            </div>
          </div>
        )}

      </div>

      {isHospital && (
        <AcknowledgeModal
          show={showAck}
          loading={ackLoading}
          error={ackError}
          remittance={ackTarget}
          onHide={() => setShowAck(false)}
          onConfirm={handleAcknowledge}
        />
      )}

    </Container>
  );
}
