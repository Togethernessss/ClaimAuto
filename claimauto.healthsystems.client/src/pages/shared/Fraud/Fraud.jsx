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

export default function Fraud() {

  // ── Data ──────────────────────────────────────────────────────────────────
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('Open'); // default: open cases
  const [priority,     setPriority]     = useState('');

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

      {/* Main table */}
      <FraudCasesTable
        cases={filtered}
        loading={loading}
        error={error}
        hasFilters={hasFilters}
        onViewDetail={c => setDetailCase(c)}
        onResolve={c => setResolveCase(c)}
        onRetry={fetchCases}
      />

      {/* Modals */}
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
