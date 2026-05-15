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

export default function Remittance() {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  // ── List state ────────────────────────────────────────────────────────────
  const [remittances, setRemittances] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);
  const [errorMsg,    setErrorMsg]    = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  // ── Acknowledge modal state ───────────────────────────────────────────────
  const [showAck,     setShowAck]     = useState(false);
  const [ackTarget,   setAckTarget]   = useState(null);
  const [ackError,    setAckError]    = useState(null);
  const [ackLoading,  setAckLoading]  = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // ── Load remittances ──────────────────────────────────────────────────────
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

  // Auto-clear toasts
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

  // ── Acknowledge ───────────────────────────────────────────────────────────
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
        `Remittance ${formatId(ackTarget.remittanceID)} acknowledged successfully.`
      );
      loadRemittances();
    } catch {
      setAckError('Failed to acknowledge remittance. Please try again.');
    } finally {
      setAckLoading(false);
      setActionLoading(null);
    }
  }

  function formatId(id) { return `#REM-${id}`; }

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('All');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <Container fluid className="p-0">

      {/* Header */}
      <RemittanceHeader
        successMsg={successMsg}
        errorMsg={errorMsg}
      />

      <div className="px-4 pb-4">

        {/* Summary cards + alert banner */}
        {!loading && !error && (
          <RemittanceSummary remittances={remittances} />
        )}

        {/* Filters */}
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

        {/* Table */}
        <RemittanceTable
          remittances={remittances}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          onRetry={loadRemittances}
          onOpenAcknowledge={openAcknowledgeModal}
        />

      </div>

      {/* Acknowledge Modal — Hospital only */}
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