// src/pages/shared/Adjudication/Adjudication.jsx
import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { getAllClaims } from '../../../services/claims/claimService';
import {
  manualAdjudicate,
  getAdjudication,
  getRuleTrace,
} from '../../../services/adjudication/adjudicationService';

import AdjudicationHeader      from './components/AdjudicationHeader';
import AdjudicationFilters     from './components/AdjudicationFilters';
import AdjudicationSummary     from './components/AdjudicationSummary';
import AdjudicationTable       from './components/AdjudicationTable';
import ManualAdjudicateModal   from './components/ManualAdjudicateModal';
import AdjudicationResultModal from './components/AdjudicationResultModal';

export default function Adjudication() {

  const [activeTab, setActiveTab] = useState('pending');

  const [claims,        setClaims]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [successMsg,    setSuccessMsg]    = useState(null);
  const [errorMsg,      setErrorMsg]      = useState(null);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [actionLoading, setActionLoading] = useState(null);

  const [showManual,    setShowManual]    = useState(false);
  const [manualTarget,  setManualTarget]  = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError,   setManualError]   = useState(null);

  const [showResult,    setShowResult]    = useState(false);
  const [resultClaim,   setResultClaim]   = useState(null);
  const [resultData,    setResultData]    = useState(null);
  const [ruleTrace,     setRuleTrace]     = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllClaims();
      setClaims(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load claims.';
      setError(typeof msg === 'string' ? msg : 'Failed to load claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  // Pending tab — claims needing manual decision
  const pendingClaims = claims.filter(
    c => c.status === 'Submitted' || c.status === 'UnderReview'
  );

  // History tab — all claims with search + status filter
  const historyClaims = claims.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      String(c.claimID).includes(q)            ||
      c.memberName?.toLowerCase().includes(q)   ||
      c.providerName?.toLowerCase().includes(q) ||
      c.policyName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const hasFilters = !!search || statusFilter !== 'All';

  // Manual adjudication
  const openManual = (claim) => {
    setManualTarget(claim);
    setManualError(null);
    setShowManual(true);
  };

  const handleManualAdjudicate = async (dto) => {
    setManualLoading(true);
    setManualError(null);
    setActionLoading(manualTarget.claimID);
    try {
      const result = await manualAdjudicate(dto);
      setShowManual(false);
      await loadClaims();
      setSuccessMsg(`CLM-${manualTarget.claimID} adjudicated. Decision: ${result.decision}.`);
      openResult(manualTarget, result);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Manual adjudication failed.';
      setManualError(typeof msg === 'string' ? msg : 'Manual adjudication failed.');
    } finally {
      setManualLoading(false);
      setActionLoading(null);
    }
  };

  // View result
  const openResult = async (claim, preloaded = null) => {
    setResultClaim(claim);
    setResultData(preloaded);
    setRuleTrace(null);
    setResultLoading(!preloaded);
    setShowResult(true);
    try {
      if (!preloaded) {
        const rec = await getAdjudication(claim.claimID);
        setResultData(rec);
      }
      const trace = await getRuleTrace(claim.claimID);
      setRuleTrace(trace);
    } catch { /* silent */ }
    finally { setResultLoading(false); }
  };

  return (
    <Container fluid>

      {/* Header — same pattern as Policies/Members/Claims */}
      <AdjudicationHeader successMsg={successMsg} errorMsg={errorMsg} />

      {/* Summary cards — same pattern as Policies/Members/Claims */}
      {!loading && !error && claims.length > 0 && (
        <AdjudicationSummary claims={claims} />
      )}

      {/* ── TAB BAR — underline style, same visual weight as filter row ──── */}
      <div style={{
        display: 'flex',
        borderBottom: '1.5px solid #dee2e6',
        marginBottom: 20,
        gap: 0,
      }}>
        {/* Pending Review tab */}
        <button
          onClick={() => setActiveTab('pending')}
          type="button"
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: activeTab === 'pending'
              ? '2.5px solid #667eea'
              : '2.5px solid transparent',
            marginBottom: -1.5,
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'pending' ? 600 : 400,
            fontSize: 14,
            color: activeTab === 'pending' ? '#667eea' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.15s',
          }}
        >
          <i className="bi bi-hourglass-split" style={{ fontSize: 13 }}></i>
          Pending Review
          {/* Count pill — matches the style used in Claims/Policies */}
          <span style={{
            background: pendingClaims.length > 0
              ? (activeTab === 'pending' ? '#667eea' : '#fdecea')
              : '#f5f5f5',
            color: pendingClaims.length > 0
              ? (activeTab === 'pending' ? 'white' : '#b71c1c')
              : '#9e9e9e',
            borderRadius: 20,
            padding: '1px 8px',
            fontSize: 11,
            fontWeight: 600,
            minWidth: 22,
            textAlign: 'center',
          }}>
            {pendingClaims.length}
          </span>
          {/* Alert dot when not active but has items */}
          {pendingClaims.length > 0 && activeTab !== 'pending' && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#ef4444', flexShrink: 0,
            }}></span>
          )}
        </button>

        {/* All Claims tab */}
        <button
          onClick={() => setActiveTab('history')}
          type="button"
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: activeTab === 'history'
              ? '2.5px solid #667eea'
              : '2.5px solid transparent',
            marginBottom: -1.5,
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'history' ? 600 : 400,
            fontSize: 14,
            color: activeTab === 'history' ? '#667eea' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.15s',
          }}
        >
          <i className="bi bi-clock-history" style={{ fontSize: 13 }}></i>
          All Claims
          <span style={{
            background: activeTab === 'history' ? '#667eea' : '#f0f0f0',
            color: activeTab === 'history' ? 'white' : '#6c757d',
            borderRadius: 20,
            padding: '1px 8px',
            fontSize: 11,
            fontWeight: 600,
            minWidth: 22,
            textAlign: 'center',
          }}>
            {claims.length}
          </span>
        </button>
      </div>

      {/* ── PENDING REVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <>
          {!loading && pendingClaims.length > 0 && (
            <div
              className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-2"
              style={{ background: '#fff8f0', border: '1px solid #ffe0b2', fontSize: 13 }}
            >
              <i className="bi bi-info-circle-fill" style={{ color: '#e65100', flexShrink: 0 }}></i>
              <span style={{ color: '#664400' }}>
                <strong>{pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''}</strong>{' '}
                waiting for manual adjudication decision.
              </span>
            </div>
          )}
          <AdjudicationTable
            claims={pendingClaims}
            loading={loading}
            error={error}
            hasFilters={false}
            actionLoading={actionLoading}
            onRetry={loadClaims}
            onManualAdjudicate={openManual}
            onViewResult={openResult}
            isPendingQueue={true}
          />
        </>
      )}

      {/* ── ALL CLAIMS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          <AdjudicationFilters
            search={search}
            statusFilter={statusFilter}
            filteredCount={historyClaims.length}
            totalCount={claims.length}
            loading={loading}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
          />
          <AdjudicationTable
            claims={historyClaims}
            loading={loading}
            error={error}
            hasFilters={hasFilters}
            actionLoading={actionLoading}
            onRetry={loadClaims}
            onManualAdjudicate={openManual}
            onViewResult={openResult}
            isPendingQueue={false}
          />
        </>
      )}

      {/* Modals */}
      <ManualAdjudicateModal
        show={showManual}
        loading={manualLoading}
        error={manualError}
        claim={manualTarget}
        onHide={() => setShowManual(false)}
        onSubmit={handleManualAdjudicate}
      />
      <AdjudicationResultModal
        show={showResult}
        claim={resultClaim}
        result={resultData}
        ruleTrace={ruleTrace}
        loading={resultLoading}
        onHide={() => { setShowResult(false); setResultData(null); setRuleTrace(null); }}
      />

    </Container>
  );
}
