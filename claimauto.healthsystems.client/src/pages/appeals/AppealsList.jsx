import { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import WelcomeBanner from '../../components/WelcomeBanner';

import { getAllAppeals } from '../../services/appeals/appealService';

import AppealStatsRow      from '../../components/appeals/AppealStatsRow';
import AppealFilters       from '../../components/appeals/AppealFilters';
import AppealsTable        from '../../components/appeals/AppealsTable';
import FileAppealModal     from '../../components/appeals/FileAppealModal';
import DecideAppealModal   from '../../components/appeals/DecideAppealModal';
import WithdrawConfirmModal from '../../components/appeals/WithdrawConfirmModal';

export default function AppealsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isStaff = ['Admin', 'InsuranceStaff'].includes(user?.role);

  // Data state
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter state
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');

  // Modal state
  const [showFile,       setShowFile]       = useState(false);
  const [showDecide,     setShowDecide]     = useState(false);
  const [showWithdraw,   setShowWithdraw]   = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [presetClaimId,  setPresetClaimId]  = useState(null);

  // ── LOAD APPEALS ────────────────────────────────────────────────────────
  const loadAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAppeals();
      setAppeals(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load appeals.';
      setError(typeof msg === 'string' ? msg : 'Failed to load appeals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  // Auto-open file modal if ?claim=XX in URL
  useEffect(() => {
    const claimId = searchParams.get('claim');
    if (claimId) {
      setPresetClaimId(Number(claimId));
      setShowFile(true);
    }
  }, [searchParams]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── FILTERED LIST ──────────────────────────────────────────────────────
  const filtered = appeals.filter((a) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      String(a.appealID).includes(s) ||
      String(a.claimID).includes(s) ||
      a.filedByName?.toLowerCase().includes(s) ||
      a.reason?.toLowerCase().includes(s);
    const matchStatus  = statusFilter  === 'All' || a.status  === statusFilter;
    const matchOutcome = outcomeFilter === 'All' || a.outcome === outcomeFilter;
    return matchSearch && matchStatus && matchOutcome;
  });

  // ── HANDLERS ───────────────────────────────────────────────────────────
  const handleFileSuccess = () => {
    setSuccessMsg('Appeal filed successfully.');
    setPresetClaimId(null);
    loadAppeals();
  };

  const handleDecideClick = (appeal) => {
    setSelectedAppeal(appeal);
    setShowDecide(true);
  };

  const handleDecideSuccess = (id, outcome) => {
    setSuccessMsg(`Appeal APP-${id} decided as ${outcome}.`);
    loadAppeals();
  };

  const handleWithdrawClick = (appeal) => {
    setSelectedAppeal(appeal);
    setShowWithdraw(true);
  };

  const handleWithdrawSuccess = (id) => {
    setSuccessMsg(`Appeal APP-${id} withdrawn successfully.`);
    loadAppeals();
  };

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <Container fluid className="p-0">

      <WelcomeBanner
        emoji="⚖️"
        actions={[
          {
            label: 'File New Appeal',
            icon: 'bi-journal-plus',
            variant: 'light',
            onClick: () => { setPresetClaimId(null); setShowFile(true); },
          },
          ...(isStaff ? [{
            label: 'Subrogation',
            icon: 'bi-arrow-counterclockwise',
            variant: 'outline-light',
            onClick: () => navigate('/appeals/subrogation'),
          }] : []),
          {
            label: 'Refresh',
            icon: 'bi-arrow-clockwise',
            variant: 'outline-light',
            onClick: loadAppeals,
          },
        ]}
      />

      <div className="px-4 pb-4">

        {/* Success toast */}
        {successMsg && (
          <Alert variant="success" className="d-flex align-items-center py-2 mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMsg}
          </Alert>
        )}

        {/* Stats */}
        <AppealStatsRow appeals={appeals} />

        {/* Filters */}
        <AppealFilters
          search={search} setSearch={setSearch}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          outcomeFilter={outcomeFilter} setOutcomeFilter={setOutcomeFilter}
          totalCount={appeals.length}
          filteredCount={filtered.length}
        />

        {/* Table */}
        <AppealsTable
          appeals={filtered}
          loading={loading}
          error={error}
          isStaff={isStaff}
          currentUserName={user?.name}
          onReload={loadAppeals}
          onWithdraw={handleWithdrawClick}
          onDecide={handleDecideClick}
        />
      </div>

      {/* Modals */}
      <FileAppealModal
        show={showFile}
        onClose={() => { setShowFile(false); setPresetClaimId(null); }}
        onSuccess={handleFileSuccess}
        defaultClaimId={presetClaimId}
      />
      <DecideAppealModal
        show={showDecide}
        onClose={() => setShowDecide(false)}
        onSuccess={handleDecideSuccess}
        appeal={selectedAppeal}
      />
      <WithdrawConfirmModal
        show={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={handleWithdrawSuccess}
        appeal={selectedAppeal}
      />
    </Container>
  );
}