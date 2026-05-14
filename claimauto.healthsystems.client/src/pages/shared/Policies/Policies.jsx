import { useState, useEffect, useCallback } from 'react';
import { Container }                        from 'react-bootstrap';
import { useAuth }                          from '../../../security/AuthContext';
import { canAccess }                        from '../../../security/permissions';
import {
  getAllPolicies,
  getActivePolicies,
  createPolicy,
  updatePolicy,
  deactivatePolicy,
  checkExpiredPolicies,
} from '../../../services/policies/policyService';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
} from '../../../models/policies/PolicyDto';

// ── Child components ──────────────────────────────────────────────────────────
import PoliciesHeader    from './components/PoliciesHeader';
import PoliciesFilters   from './components/PoliciesFilters';
import PoliciesSummary   from './components/PoliciesSummary';
import PoliciesTable     from './components/PoliciesTable';
import CreateModal       from './components/CreateModal';
import EditModal         from './components/EditModal';
import DeactivateModal   from './components/DeactivateModal';

// Empty form constants — created once, reused to reset forms
const EMPTY_CREATE = new CreatePolicyDto();
const EMPTY_UPDATE = new UpdatePolicyDto();

export default function Policies() {

  // ── WHO IS LOGGED IN + PERMISSIONS ───────────────────────────────────────
  const { user }   = useAuth();
  const isAdmin    = canAccess(user?.role, ['Admin']);
  const isHospital = canAccess(user?.role, ['Hospital']);

  // ── LIST STATE ────────────────────────────────────────────────────────────
  const [policies,   setPolicies]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── FILTER STATE ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // ── CREATE MODAL STATE ────────────────────────────────────────────────────
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState(EMPTY_CREATE);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState(null);

  // ── EDIT MODAL STATE ──────────────────────────────────────────────────────
  const [showEdit,    setShowEdit]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [editForm,    setEditForm]    = useState(EMPTY_UPDATE);
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState(null);

  // ── DEACTIVATE MODAL STATE ────────────────────────────────────────────────
  const [showDeactivate,    setShowDeactivate]    = useState(false);
  const [deactivateTarget,  setDeactivateTarget]  = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError,   setDeactivateError]   = useState(null);

  // ── LOAD DATA ─────────────────────────────────────────────────────────────
  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isHospital
        ? await getActivePolicies()
        : await getAllPolicies();
      setPolicies(data);
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to load policies.';
      setError(typeof msg === 'string' ? msg : 'Failed to load policies.');
    } finally {
      setLoading(false);
    }
  }, [isHospital]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── FILTERED LIST ─────────────────────────────────────────────────────────
  const filtered = policies.filter((p) => {
    const matchSearch =
      p.planCode?.toLowerCase().includes(search.toLowerCase()) ||
      p.planName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const hasFilters = !!search || statusFilter !== 'All';

  // ── CREATE HANDLERS ───────────────────────────────────────────────────────
  const handleCreateField = (field) => (e) =>
    setCreateForm({ ...createForm, [field]: e.target.value });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await createPolicy({
        planCode:          createForm.planCode,
        planName:          createForm.planName,
        coverageRulesJSON: createForm.coverageRulesJSON || null,
        deductibleAmount:  createForm.deductibleAmount !== ''
                             ? Number(createForm.deductibleAmount) : null,
        outOfPocketMax:    createForm.outOfPocketMax !== ''
                             ? Number(createForm.outOfPocketMax) : null,
        effectiveFrom:     createForm.effectiveFrom,
        effectiveTo:       createForm.effectiveTo || null,
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      try { await checkExpiredPolicies(); } catch { }
      await loadPolicies();
      setSuccessMsg('Policy created successfully.');
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to create policy.';
      setCreateError(typeof msg === 'string' ? msg : 'Failed to create policy.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── EDIT HANDLERS ─────────────────────────────────────────────────────────
  const openEdit = (policy) => {
    setEditTarget(policy);
    setEditForm(new UpdatePolicyDto({
      planName:          policy.planName          ?? '',
      coverageRulesJSON: policy.coverageRulesJSON ?? '',
      deductibleAmount:  policy.deductibleAmount  ?? '',
      outOfPocketMax:    policy.outOfPocketMax    ?? '',
      effectiveTo:       policy.effectiveTo
                           ? policy.effectiveTo.split('T')[0]
                           : '',
      status:            policy.status            ?? '',
    }));
    setEditError(null);
    setShowEdit(true);
  };

  const handleEditField = (field) => (e) =>
    setEditForm({ ...editForm, [field]: e.target.value });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    try {
      await updatePolicy(editTarget.policyID, {
        planName:          editForm.planName          || null,
        coverageRulesJSON: editForm.coverageRulesJSON || null,
        deductibleAmount:  editForm.deductibleAmount !== ''
                            ? Number(editForm.deductibleAmount) : null,
        outOfPocketMax:    editForm.outOfPocketMax !== ''
                            ? Number(editForm.outOfPocketMax) : null,
        effectiveTo:       editForm.effectiveTo || null,
        status:            editForm.status      || null,
      });

      setShowEdit(false);

        // ── Run expiry check immediately after save ──────────────────────────
        // Also checks 7-day and 2-hour warnings in one call.
        // expireResult is declared OUTSIDE the try so we can use it below.
        let expireResult = null;
        try {
          expireResult = await checkExpiredPolicies();
        } catch {
          // Silently ignore — don't block success flow
        }

        // Reload list AFTER expiry check so statuses are fresh
        await loadPolicies();

        // ── Smart success message showing all 3 alert types ─────────────────
        const expired = expireResult?.expired    ?? 0;
        const warned7 = expireResult?.warned7Day  ?? 0;
        const warned2 = expireResult?.warned2Hour ?? 0;

        const parts = [];
        if (expired > 0)
          parts.push(`${expired} ${expired === 1 ? 'policy' : 'policies'} expired`);
        if (warned7 > 0)
          parts.push(`${warned7} expiring in 7 days`);
        if (warned2 > 0)
          parts.push(`${warned2} expiring in ~2 hours`);

        setSuccessMsg(
          parts.length > 0
            ? `Policy "${editTarget.planName}" updated. Alerts: ${parts.join(', ')}.`
            : `Policy "${editTarget.planName}" updated successfully.`
        );

    } catch (err) {
      const msg = err.response?.data?.message
              || err.response?.data
              || 'Failed to update policy.';
      setEditError(typeof msg === 'string' ? msg : 'Failed to update policy.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── DEACTIVATE HANDLERS ───────────────────────────────────────────────────
  const openDeactivate = (policy) => {
    setDeactivateTarget(policy);
    setDeactivateError(null);
    setShowDeactivate(true);
  };

  const handleDeactivateConfirm = async () => {
    setDeactivateError(null);
    setDeactivateLoading(true);
    try {
      await deactivatePolicy(deactivateTarget.policyID);
      setShowDeactivate(false);
      await loadPolicies();
      setSuccessMsg(`Policy "${deactivateTarget.planName}" deactivated.`);
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to deactivate.';
      setDeactivateError(
        typeof msg === 'string' ? msg : 'Failed to deactivate.'
      );
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  // Notice how clean this is — just assembling components,
  // passing data down via props, passing handlers as callbacks
  return (
    <Container fluid>

      {/* Title + Create button + success toast */}
      <PoliciesHeader
        isAdmin={isAdmin}
        isHospital={isHospital}
        successMsg={successMsg}
        onCreateClick={() => {
          setCreateForm(EMPTY_CREATE);
          setCreateError(null);
          setShowCreate(true);
        }}
      />

      {/* Search + filter — hidden for Hospital */}
      {!isHospital && (
        <PoliciesFilters
          search={search}
          statusFilter={statusFilter}
          filteredCount={filtered.length}
          totalCount={policies.length}
          loading={loading}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
        />
      )}

      {/* Summary cards — hidden for Hospital */}
      {!isHospital && !loading && !error && (
        <PoliciesSummary policies={policies} />
      )}

      {/* Main data table */}
      <PoliciesTable
        policies={filtered}
        loading={loading}
        error={error}
        isAdmin={isAdmin}
        isHospital={isHospital}
        hasFilters={hasFilters}
        onRetry={loadPolicies}
        onEdit={openEdit}
        onDeactivate={openDeactivate}
        onCreateFirst={() => setShowCreate(true)}
      />

      {/* Modals */}
      <CreateModal
        show={showCreate}
        loading={createLoading}
        error={createError}
        form={createForm}
        onHide={() => setShowCreate(false)}
        onFieldChange={handleCreateField}
        onSubmit={handleCreateSubmit}
      />

      <EditModal
        show={showEdit}
        loading={editLoading}
        error={editError}
        form={editForm}
        policy={editTarget}
        onHide={() => setShowEdit(false)}
        onFieldChange={handleEditField}
        onSubmit={handleEditSubmit}
      />

      <DeactivateModal
        show={showDeactivate}
        loading={deactivateLoading}
        error={deactivateError}
        policy={deactivateTarget}
        onHide={() => setShowDeactivate(false)}
        onConfirm={handleDeactivateConfirm}
      />
    </Container>
  );
}