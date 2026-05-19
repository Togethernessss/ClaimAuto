import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../../security/AuthContext';
import { canAccess } from '../../../security/permissions';
import {
  getAllPayments,
  authorizePayment,
  executePayment,
  holdPayment,
  resumePayment,
  createPayment,
} from '../../../services/payments/paymentService';
import { CreatePaymentDto } from '../../../models/payments/PaymentDto';

import PaymentsHeader       from './components/PaymentsHeader';
import PaymentsFilters      from './components/PaymentsFilters';
import PaymentsSummary      from './components/PaymentsSummary';
import PaymentsTable        from './components/PaymentsTable';
import ExecuteModal         from './components/ExecuteModal';
import HoldConfirmModal     from './components/HoldConfirmModal';
import ResumeConfirmModal   from './components/ResumeConfirmModal';
import CreatePaymentModal   from './components/CreatePaymentModal';
import ReconciliationTab    from './components/ReconciliationTab';

const EMPTY_CREATE = {
  claimID: null, payeeID: null, amount: '',
  currency: 'INR', paymentMethod: 'EFT', scheduledAt: '',
};

export default function Payments() {
  const { user } = useAuth();
  const isStaff  = canAccess(user?.role, ['InsuranceStaff']);

  // ── Active tab ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('payments');

  // ── List state ────────────────────────────────────────────────
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg,   setErrorMsg]   = useState(null);

  // ── Filter + search ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('All');
  const [search,       setSearch]       = useState('');

  // ── Action loading ────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(null);

  // ── Execute modal ─────────────────────────────────────────────
  const [showExecute,      setShowExecute]      = useState(false);
  const [executePaymentId, setExecutePaymentId] = useState(null);
  const [referenceNumber,  setReferenceNumber]  = useState('');
  const [executeError,     setExecuteError]     = useState(null);
  const [executeLoading,   setExecuteLoading]   = useState(false);

  // ── Hold modal ────────────────────────────────────────────────
  const [showHold,    setShowHold]    = useState(false);
  const [holdTarget,  setHoldTarget]  = useState(null);
  const [holdError,   setHoldError]   = useState(null);
  const [holdLoading, setHoldLoading] = useState(false);

  // ── Resume modal ──────────────────────────────────────────────
  const [showResume,    setShowResume]    = useState(false);
  const [resumeTarget,  setResumeTarget]  = useState(null);
  const [resumeError,   setResumeError]   = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  // ── Create modal ──────────────────────────────────────────────
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState(EMPTY_CREATE);
  const [createError,   setCreateError]   = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // ── Load payments ─────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPayments(
        statusFilter !== 'All' ? statusFilter : null
      );
      setPayments(data);
    } catch {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

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

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(p.paymentID).includes(q) ||
      p.payeeName?.toLowerCase().includes(q)
    );
  });

  // ── Authorize ─────────────────────────────────────────────────
  async function handleAuthorize(id) {
    setActionLoading(id);
    try {
      await authorizePayment(id);
      setSuccessMsg(`Payment #PAY-${id} authorized successfully.`);
      loadPayments();
    } catch {
      setErrorMsg('Failed to authorize payment.');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Execute ───────────────────────────────────────────────────
  function openExecuteModal(id) {
    setExecutePaymentId(id);
    setReferenceNumber('');
    setExecuteError(null);
    setShowExecute(true);
  }

  async function handleExecute() {
    if (!referenceNumber.trim()) {
      setExecuteError('Reference number is required.');
      return;
    }
    setExecuteLoading(true);
    try {
      await executePayment(executePaymentId, referenceNumber.trim());
      setShowExecute(false);
      setSuccessMsg(
        `Payment #PAY-${executePaymentId} executed successfully.`
      );
      loadPayments();
    } catch {
      setExecuteError('Failed to execute payment.');
    } finally {
      setExecuteLoading(false);
    }
  }

  // ── Hold ──────────────────────────────────────────────────────
  function openHoldModal(payment) {
    setHoldTarget(payment);
    setHoldError(null);
    setShowHold(true);
  }

  async function handleHold() {
    setHoldLoading(true);
    try {
      await holdPayment(holdTarget.paymentID);
      setShowHold(false);
      setSuccessMsg(
        `Payment #PAY-${holdTarget.paymentID} placed on hold.`
      );
      loadPayments();
    } catch {
      setHoldError('Failed to hold payment.');
    } finally {
      setHoldLoading(false);
    }
  }

  // ── Resume ────────────────────────────────────────────────────
  function openResumeModal(payment) {
    setResumeTarget(payment);
    setResumeError(null);
    setShowResume(true);
  }

  async function handleResume() {
    setResumeLoading(true);
    try {
      await resumePayment(resumeTarget.paymentID);
      setShowResume(false);
      setSuccessMsg(
        `Payment #PAY-${resumeTarget.paymentID} resumed to Pending.`
      );
      loadPayments();
    } catch {
      setResumeError('Failed to resume payment.');
    } finally {
      setResumeLoading(false);
    }
  }

  // ── Create ────────────────────────────────────────────────────
  const handleCreateField = (field) => (e) =>
    setCreateForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleCreate() {
    if (!createForm.claimID || !createForm.amount) {
      setCreateError('Please select a claim and enter an amount.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const dto = new CreatePaymentDto({
        claimID:       createForm.claimID,
        payeeID:       createForm.payeeID,
        amount:        parseFloat(createForm.amount),
        currency:      createForm.currency,
        paymentMethod: createForm.paymentMethod,
        scheduledAt:   createForm.scheduledAt || null,
      });
      await createPayment(dto);
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setSuccessMsg('Payment created successfully.');
      loadPayments();
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to create payment.';
      setCreateError(
        typeof msg === 'string' ? msg : 'Failed to create payment.'
      );
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <Container fluid className="p-0">

      <PaymentsHeader
        successMsg={successMsg}
        errorMsg={errorMsg}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateClick={() => {
          setCreateForm(EMPTY_CREATE);
          setCreateError(null);
          setShowCreate(true);
        }}
      />

      <div className="px-4 pb-4 pt-4">

        {/* ── Payments tab ───────────────────────────────────── */}
        {activeTab === 'payments' && (
          <>
            <PaymentsFilters
              search={search}
              statusFilter={statusFilter}
              filteredCount={filtered.length}
              totalCount={payments.length}
              loading={loading}
              onSearchChange={setSearch}
              onStatusChange={setStatusFilter}
            />

            {!loading && !error && (
              <PaymentsSummary payments={payments} />
            )}

            <PaymentsTable
              payments={filtered}
              loading={loading}
              error={error}
              actionLoading={actionLoading}
              onRetry={loadPayments}
              onAuthorize={handleAuthorize}
              onOpenExecute={openExecuteModal}
              onOpenHold={openHoldModal}
              onOpenResume={openResumeModal}
            />
          </>
        )}

        {/* ── Reconciliation tab ─────────────────────────────── */}
        {activeTab === 'reconciliation' && (
          <ReconciliationTab />
        )}

      </div>

      <ExecuteModal
        show={showExecute}
        loading={executeLoading}
        error={executeError}
        paymentId={executePaymentId}
        referenceNumber={referenceNumber}
        onReferenceChange={setReferenceNumber}
        onHide={() => setShowExecute(false)}
        onConfirm={handleExecute}
      />

      <HoldConfirmModal
        show={showHold}
        loading={holdLoading}
        error={holdError}
        payment={holdTarget}
        onHide={() => setShowHold(false)}
        onConfirm={handleHold}
      />

      <ResumeConfirmModal
        show={showResume}
        loading={resumeLoading}
        error={resumeError}
        payment={resumeTarget}
        onHide={() => setShowResume(false)}
        onConfirm={handleResume}
      />

      {isStaff && (
        <CreatePaymentModal
          show={showCreate}
          loading={createLoading}
          error={createError}
          form={createForm}
          payments={payments}
          onHide={() => setShowCreate(false)}
          onFieldChange={handleCreateField}
          onSubmit={handleCreate}
        />
      )}

    </Container>
  );
}