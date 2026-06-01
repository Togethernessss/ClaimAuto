// src/pages/shared/Fraud/Fraud.jsx
import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { getAllFraudCases } from '../../../services/fraud/fraudService';

import FraudHeader      from './components/FraudHeader';
import FraudFilters     from './components/FraudFilters';
import FraudSummary     from './components/FraudSummary';
import FraudCasesTable  from './components/FraudCasesTable';
import ScoreClaimModal  from './components/ScoreClaimModal';
import OpenCaseModal    from './components/OpenCaseModal';
import CaseDetailModal  from './components/CaseDetailModal';
import ResolveCaseModal from './components/ResolveCaseModal';

// ── Pagination helpers ────────────────────────────────────────────────────────
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
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1)
      result.push('...');
  }
  return result;
}

export default function Fraud() {

  // ── Data ──────────────────────────────────────────────────────────────────
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [priority,     setPriority]     = useState('');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showOpenModal,  setShowOpenModal]  = useState(false);
  const [detailCase,     setDetailCase]     = useState(null);
  const [resolveCase,    setResolveCase]    = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllFraudCases();
      setCases(data);
    } catch {
      setError('Failed to load fraud cases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // ── Auto-clear messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(''), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      String(c.caseID).includes(q) ||
      String(c.claimID).includes(q) ||
      (c.openedByName || '').toLowerCase().includes(q);
    const matchStatus   = statusFilter === 'All' || c.status === statusFilter;
    const matchPriority = !priority || c.priority === priority;
    return matchSearch && matchStatus && matchPriority;
  });

  const hasFilters = !!search || statusFilter !== 'All' || !!priority;

  // ── Reset to page 1 when filters change ──────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priority]);

  // ── Pagination derived values ─────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(currentPage, totalPages);
  const startIdx    = (safePage - 1) * PAGE_SIZE;
  const endIdx      = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const pagedCases  = filtered.slice(startIdx, endIdx);

  // isPendingTab: true when showing Open cases (needs urgent styling)
  const isPendingTab = statusFilter === 'Open';

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleScored() {
    setSuccessMsg('Fraud score calculated successfully.');
    fetchCases();
  }

  function handleCaseCreated(msg) {
    setSuccessMsg(msg);
    fetchCases();
  }

  function handleCaseResolved(msg) {
    setSuccessMsg(msg);
    fetchCases();
  }

  return (
    <Container fluid>

      {/* Header */}
      <FraudHeader
        onScoreClaim={() => setShowScoreModal(true)}
        onOpenCase={() => setShowOpenModal(true)}
        successMsg={successMsg}
        errorMsg={errorMsg}
      />

      {/* Filters */}
      <FraudFilters
        search={search}
        statusFilter={statusFilter}
        priority={priority}
        filteredCount={filtered.length}
        totalCount={cases.length}
        loading={loading}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriority}
      />

      {/* Summary cards */}
      {!loading && !error && cases.length > 0 && (
        <FraudSummary cases={cases} />
      )}

      {/* Main table — receives paged slice */}
      <FraudCasesTable
        cases={pagedCases}
        loading={loading}
        error={error}
        isPendingTab={isPendingTab}
        hasFilters={hasFilters}
        onViewDetail={c => setDetailCase(c)}
        onResolve={c => setResolveCase(c)}
        onRetry={fetchCases}
      />

      {/* ── Pagination controls ──────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          marginTop: 14, paddingLeft: 2, paddingRight: 2,
        }}>
          {/* Record count */}
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}
            <strong>{filtered.length}</strong> case{filtered.length !== 1 ? 's' : ''}
          </div>

          {/* Page buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

            {/* Prev */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '5px 14px', borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: safePage === 1 ? '#f8fafc' : 'white',
                color: safePage === 1 ? '#cbd5e1' : '#475569',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <i className="bi bi-chevron-left me-1"></i>Prev
            </button>

            {/* Page number buttons */}
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: 36, height: 34, borderRadius: 8,
                    border: safePage === p ? 'none' : '1px solid #e2e8f0',
                    background: safePage === p
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'white',
                    color: safePage === p ? 'white' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: safePage === p ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: safePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none',
                  }}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: '5px 14px', borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: safePage === totalPages ? '#f8fafc' : 'white',
                color: safePage === totalPages ? '#cbd5e1' : '#475569',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Next<i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ScoreClaimModal
        show={showScoreModal}
        onHide={() => setShowScoreModal(false)}
        onScored={handleScored}
      />

      <OpenCaseModal
        show={showOpenModal}
        onHide={() => setShowOpenModal(false)}
        onCreated={handleCaseCreated}
      />

      <CaseDetailModal
        show={!!detailCase}
        onHide={() => setDetailCase(null)}
        fraudCase={detailCase}
      />

      <ResolveCaseModal
        show={!!resolveCase}
        onHide={() => setResolveCase(null)}
        fraudCase={resolveCase}
        onResolved={handleCaseResolved}
      />

    </Container>
  );
}
