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
import { getMyMemberEnrollments } from '../../../services/members/memberService';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
} from '../../../models/policies/PolicyDto';

// ── Child components ──────────────────────────────────────────────────────────
import PoliciesHeader    from './components/PoliciesHeader';
import PoliciesFilters   from './components/PoliciesFilters';
import PoliciesSummary   from './components/PoliciesSummary';
import PoliciesTable     from './components/PoliciesTable';
import PolicyDetailModal from './components/PolicyDetailModal';
import CreateModal       from './components/CreateModal';
import EditModal         from './components/EditModal';
import DeactivateModal   from './components/DeactivateModal';

// ── Pagination ────────────────────────────────────────────────────────────────
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

// Empty form constants — created once, reused to reset forms
const EMPTY_CREATE = new CreatePolicyDto();
const EMPTY_UPDATE = new UpdatePolicyDto();

export default function Policies() {

  // ── WHO IS LOGGED IN + PERMISSIONS ───────────────────────────────────────
  const { user }   = useAuth();
  const isAdmin    = canAccess(user?.role, ['Admin']);
  const isHospital = canAccess(user?.role, ['Hospital']);
  const isPolicyholder = canAccess(user?.role, ['Policyholder']);

  // ── LIST STATE ────────────────────────────────────────────────────────────
  const [policies,   setPolicies]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── FILTER STATE ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage,  setCurrentPage]  = useState(1);

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

  // ── DETAIL MODAL STATE ────────────────────────────────────────────────────
  const [showDetail,   setShowDetail]   = useState(false);
  const [detailPolicy, setDetailPolicy] = useState(null);

  // ── POLICYHOLDER MEMBER ENROLLMENT ───────────────────────────────────────
  const [myMember,      setMyMember]      = useState(null);
  const [myMembers,     setMyMembers]     = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (!isPolicyholder) return;
    setMemberLoading(true);
    getMyMemberEnrollments()
      .then((data) => {
        const enrollments = Array.isArray(data) ? data : [];
        setMyMembers(enrollments);
        setMyMember(enrollments[0] ?? null);
      })
      .catch(() => {
        setMyMembers([]);
        setMyMember(null);
      })
      .finally(() => setMemberLoading(false));
  }, [isPolicyholder]);

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

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeePage     = Math.min(currentPage, totalPages);
  const startIdx      = (safeePage - 1) * PAGE_SIZE;
  const endIdx        = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const pagedPolicies = filtered.slice(startIdx, endIdx);

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
        sumInsured:        createForm.sumInsured !== ''
                             ? Number(createForm.sumInsured) : null,
        deductibleAmount:  createForm.deductibleAmount !== ''
                             ? Number(createForm.deductibleAmount) : null,
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
      sumInsured:        policy.sumInsured        ?? '',
      deductibleAmount:  policy.deductibleAmount  ?? '',
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
        sumInsured:        editForm.sumInsured !== ''
                            ? Number(editForm.sumInsured) : null,
        deductibleAmount:  editForm.deductibleAmount !== ''
                            ? Number(editForm.deductibleAmount) : null,
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
        <PoliciesSummary
          policies={policies}
          activeStatus={statusFilter}
          onCardClick={setStatusFilter}
        />
      )}

      {/* ── Policyholder enrollment info banner ──────────────── */}
      {isPolicyholder && !memberLoading && myMember && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          border: '1.5px solid #c4b5fd',
          borderRadius: 14, padding: '14px 18px', marginBottom: 16,
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
          }}>
            <i className="bi bi-credit-card-2-front-fill" style={{ color: 'white', fontSize: 18 }}></i>
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#4c1d95', fontSize: '0.88rem', marginBottom: 2 }}>
              Your Policy Enrollments
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Showing <strong style={{ color: '#4c1d95' }}>{policies.length}</strong>{' '}
              linked polic{policies.length === 1 ? 'y' : 'ies'} for your profile
              {myMember.memberNumber && (
                <> · Member ID: <span style={{
                  fontFamily: 'monospace', fontWeight: 700,
                  background: '#ede9fe', color: '#6d28d9',
                  padding: '1px 7px', borderRadius: 5, fontSize: '0.78rem',
                }}>{myMember.memberNumber}</span></>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>
              <i className="bi bi-info-circle me-1"></i>
              The same Member ID is used across your {myMembers.length || policies.length} linked policy enrollment{(myMembers.length || policies.length) === 1 ? '' : 's'}.
            </div>
          </div>
          {/* Status badge */}
          {myMember.status && (
            <span style={{
              flexShrink: 0,
              background: myMember.status === 'Active' ? '#d1fae5' : '#f3f4f6',
              color: myMember.status === 'Active' ? '#065f46' : '#6b7280',
              fontWeight: 700, fontSize: '0.72rem',
              padding: '4px 12px', borderRadius: 20,
              border: `1px solid ${myMember.status === 'Active' ? '#a7f3d0' : '#e5e7eb'}`,
            }}>
              {myMember.status}
            </span>
          )}
        </div>
      )}

      {/* ── Policyholder not enrolled yet banner ─────────────── */}
      {isPolicyholder && !memberLoading && !myMember && !loading && policies.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 14, padding: '12px 18px', marginBottom: 16,
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', fontSize: 16, flexShrink: 0 }}></i>
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.83rem' }}>Not yet enrolled</div>
            <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: 1 }}>
              You have not been enrolled under any policy. Contact your insurance provider to get your Member ID.
            </div>
          </div>
        </div>
      )}

      {/* Main data table */}
      <PoliciesTable
        policies={pagedPolicies}
        loading={loading}
        error={error}
        isAdmin={isAdmin}
        isHospital={isHospital}
        hasFilters={hasFilters}
        onRetry={loadPolicies}
        onEdit={openEdit}
        onDeactivate={openDeactivate}
        onCreateFirst={() => setShowCreate(true)}
        onView={(policy) => { setDetailPolicy(policy); setShowDetail(true); }}
      />

      {!loading && !error && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}
            <strong>{filtered.length}</strong> total record{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="d-flex align-items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeePage === 1}
              style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === 1 ? '#f8fafc' : 'white', color: safeePage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
              <i className="bi bi-chevron-left me-1"></i>Prev
            </button>
            {getPageNumbers(safeePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ width: 36, height: 34, borderRadius: 8, border: safeePage === p ? 'none' : '1px solid #e2e8f0', background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: safeePage === p ? 'white' : '#475569', fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none' }}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeePage === totalPages}
              style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === totalPages ? '#f8fafc' : 'white', color: safeePage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
              Next<i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}

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

      {/* Policy detail view — shown on row click for all roles */}
      <PolicyDetailModal
        show={showDetail}
        policy={detailPolicy}
        onHide={() => setShowDetail(false)}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onDeactivate={openDeactivate}
      />
    </Container>
  );
}
