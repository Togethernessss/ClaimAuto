import { useState, useEffect, useCallback } from 'react';
import { Container }                        from 'react-bootstrap';
import { useAuth }                          from '../../../security/AuthContext';
import { canAccess }                        from '../../../security/permissions';
import {
  getAllMembers,
  createMember,
  updateMember,
  checkEligibility,
  checkExpiredMembers,
} from '../../../services/members/memberService';
import { getUsersByRole } from '../../../services/identity/userService';
import { getActivePolicies } from '../../../services/policies/policyService';
import {
  CreateMemberDto,
  UpdateMemberDto,
} from '../../../models/members/MemberDto';

import MembersHeader     from './components/MembersHeader';
import MembersFilters    from './components/MembersFilters';
import MembersSummary    from './components/MembersSummary';
import MembersTable      from './components/MembersTable';
import CreateModal       from './components/CreateModal';
import EditModal         from './components/EditModal';
import EligibilityModal  from './components/EligibilityModal';

const EMPTY_CREATE = new CreateMemberDto();
const EMPTY_UPDATE = new UpdateMemberDto();

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

export default function Members() {

  // ── PERMISSIONS ───────────────────────────────────────────────────────────
  const { user }   = useAuth();
  const isAdmin    = canAccess(user?.role, ['Admin']);
  const isStaff    = canAccess(user?.role, ['InsuranceStaff']);
  const isHospital = canAccess(user?.role, ['Hospital']);
  const isPolicyholder  = canAccess(user?.role, ['Policyholder']);

  // ── LIST STATE ────────────────────────────────────────────────────────────
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── FILTER STATE ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── POLICIES (for create dropdown) ────────────────────────────────────────
  const [policies, setPolicies] = useState([]);

  // Policyholder users — for the "Link to Registered User" dropdown in Create modal
const [policyholderUsers, setPolicyholderUsers] = useState([]);

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

  // ── ELIGIBILITY MODAL STATE ───────────────────────────────────────────────
  const [showEligibility,    setShowEligibility]    = useState(false);
  const [eligibilityTarget,  setEligibilityTarget]  = useState(null);
  const [eligibilityResult,  setEligibilityResult]  = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError,   setEligibilityError]   = useState(null);

  // ── LOAD MEMBERS ──────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMembers();
      setMembers(data);
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to load members.';
      setError(typeof msg === 'string' ? msg : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Load active policies + registered Policyholder users — only Admin/Staff need these
  // (they are the only roles that can open the Create Member modal)
  useEffect(() => {
      if (!isAdmin && !isStaff) return;
      getActivePolicies()
        .then(setPolicies)
        .catch(() => setPolicies([]));
      getUsersByRole('Policyholder')
        .then(setPolicyholderUsers)
        .catch(() => setPolicyholderUsers([]));
  }, [isAdmin, isStaff]);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  // ── FILTERED LIST ─────────────────────────────────────────────────────────
  const filtered = members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        m.name?.toLowerCase().includes(q)         ||
        m.memberNumber?.toLowerCase().includes(q)  ||
        m.policyName?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchStatus;
  });

  const hasFilters = !!search || statusFilter !== 'All';

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeePage    = Math.min(currentPage, totalPages);
  const startIdx     = (safeePage - 1) * PAGE_SIZE;
  const endIdx       = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const pagedMembers = filtered.slice(startIdx, endIdx);

  // ── CREATE HANDLERS ───────────────────────────────────────────────────────
  const handleCreateField = (field) => (e) =>
    setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Auto-fills Name, Email, and Phone from the selected registered user
  const handleUserSelect = (user) => {
    setCreateForm((prev) => ({
      ...prev,
      policyholderUserID: String(user.userID),
      name:         user.name  || prev.name,
      contactEmail: user.email || prev.contactEmail,
      contactPhone: user.phone || prev.contactPhone,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      // Build contactInfoJSON from individual fields
      const contactInfo = {};
      if (createForm.contactPhone)   contactInfo.phone   = createForm.contactPhone;
      if (createForm.contactEmail)   contactInfo.email   = createForm.contactEmail;
      if (createForm.contactAddress) contactInfo.address = createForm.contactAddress;

      await createMember({
          policyID:           Number(createForm.policyID),
          name:               createForm.name,
          dob:                createForm.dob,
          gender:             createForm.gender,
          contactInfoJSON:    Object.keys(contactInfo).length > 0
                                ? JSON.stringify(contactInfo)
                                : null,
          coverageStart:      createForm.coverageStart,
          coverageEnd:        createForm.coverageEnd || null,
          policyholderUserID: Number(createForm.policyholderUserID),
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      await loadMembers();
      setSuccessMsg('Member enrolled successfully.');
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to enroll member.';
      setCreateError(typeof msg === 'string' ? msg : 'Failed to enroll member.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── EDIT HANDLERS ─────────────────────────────────────────────────────────
  const openEdit = (member) => {
    setEditTarget(member);
    // Parse existing contactInfoJSON back into individual fields
    let contactPhone   = '';
    let contactEmail   = '';
    let contactAddress = '';

    if (member.contactInfoJSON) {
      try {
        const parsed   = JSON.parse(member.contactInfoJSON);
        contactPhone   = parsed.phone   ?? '';
        contactEmail   = parsed.email   ?? '';
        contactAddress = parsed.address ?? '';
      } catch {
        // If JSON is malformed just leave fields empty
      }
    }

    setEditForm(new UpdateMemberDto({
      name:           member.name   ?? '',
      contactPhone,
      contactEmail,
      contactAddress,
      coverageEnd:    member.coverageEnd
                        ? member.coverageEnd.split('T')[0]
                        : '',
      status:         member.status ?? '',
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
      const contactInfo = {};
      if (editForm.contactPhone)   contactInfo.phone   = editForm.contactPhone;
      if (editForm.contactEmail)   contactInfo.email   = editForm.contactEmail;
      if (editForm.contactAddress) contactInfo.address = editForm.contactAddress;

      await updateMember(editTarget.memberID, {
        name:            editForm.name    || null,
        contactInfoJSON: Object.keys(contactInfo).length > 0
                          ? JSON.stringify(contactInfo)
                          : null,
        coverageEnd:     editForm.coverageEnd || null,
        status:          editForm.status      || null,
      });

      setShowEdit(false);

      // ── Run expiry check immediately after save ──────────────────
      // Handles case where CoverageEnd was set to a past date
      // Only trigger auto-expiry check if CoverageEnd was actually changed
      // (no need to scan all members when just a name or phone was updated)
      let expireResult = null;
      if (editForm.coverageEnd !== undefined) {
          try {
              expireResult = await checkExpiredMembers();
          } catch {
              // silently ignore
          }
      }

      await loadMembers();
      // If eligibility modal is open for the member we just edited,
      // clear the result so user knows to re-check
      if (eligibilityTarget?.memberID === editTarget.memberID) {
        setEligibilityResult(null);
        setShowEligibility(false);
      }

      const expired = expireResult?.expired ?? 0;
      setSuccessMsg(
        expired > 0
          ? `Member "${editTarget.name}" updated. ` +
            `${expired} ${expired === 1 ? 'member' : 'members'} ` +
            `auto-expired based on coverage end dates.`
          : `Member "${editTarget.name}" updated successfully.`
      );
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to update member.';
      setEditError(typeof msg === 'string' ? msg : 'Failed to update member.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── ELIGIBILITY HANDLERS ──────────────────────────────────────────────────
  const openEligibility = async (member) => {
    setEligibilityTarget(member);
    setEligibilityResult(null);
    setEligibilityError(null);
    setEligibilityLoading(true);
    setShowEligibility(true);
    try {
      const result = await checkEligibility(member.memberID);
      setEligibilityResult(result);
    } catch (err) {
      const msg = err.response?.data?.message
               || err.response?.data
               || 'Failed to check eligibility.';
      setEligibilityError(typeof msg === 'string' ? msg : 'Failed to check.');
    } finally {
      setEligibilityLoading(false);
    }
  };

  // Re-check forces a fresh API call (bypasses TTL cache on next call)
  const handleRecheck = () => openEligibility(eligibilityTarget);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <Container fluid>

      <MembersHeader
        isAdmin={isAdmin}
        isStaff={isStaff}
        successMsg={successMsg}
        totalCount={members.length}
        onCreateClick={() => {
          setCreateForm(EMPTY_CREATE);
          setCreateError(null);
          setShowCreate(true);
        }}
      />

      <MembersFilters
        search={search}
        statusFilter={statusFilter}
        filteredCount={filtered.length}
        totalCount={members.length}
        loading={loading}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {!loading && !error && members.length > 0 && (
          <MembersSummary
            members={members}
            activeStatus={statusFilter}
            onCardClick={setStatusFilter}
          />
      )}

      <MembersTable
        members={pagedMembers}
        loading={loading}
        error={error}
        isAdmin={isAdmin}
        isStaff={isStaff}
        isHospital={isHospital}
        hasFilters={hasFilters}
        onRetry={loadMembers}
        onEdit={openEdit}
        onCheckEligibility={openEligibility}
        onCreateFirst={() => setShowCreate(true)}
        onRowClick={openEligibility}
      />

      {!loading && !error && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}
            <strong>{filtered.length}</strong> total record{filtered.length !== 1 ? 's' : ''}
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

      <CreateModal
        show={showCreate}
        loading={createLoading}
        error={createError}
        form={createForm}
        policies={policies}
        policyholderUsers={policyholderUsers}
        existingMembers={members}    /* 1.2 — duplicate-enrollment check */
        onHide={() => setShowCreate(false)}
        onFieldChange={handleCreateField}
        onUserSelect={handleUserSelect}
        onSubmit={handleCreateSubmit}
      />

      <EditModal
        show={showEdit}
        loading={editLoading}
        error={editError}
        form={editForm}
        member={editTarget}
        onHide={() => setShowEdit(false)}
        onFieldChange={handleEditField}
        onSubmit={handleEditSubmit}
      />

      <EligibilityModal
        show={showEligibility}
        loading={eligibilityLoading}
        error={eligibilityError}
        result={eligibilityResult}
        member={eligibilityTarget}
        onHide={() => setShowEligibility(false)}
        onRecheck={handleRecheck}
      />

    </Container>
  );
}
