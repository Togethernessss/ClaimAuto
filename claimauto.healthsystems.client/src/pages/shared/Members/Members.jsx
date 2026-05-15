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

export default function Members() {

  // ── PERMISSIONS ───────────────────────────────────────────────────────────
  const { user }   = useAuth();
  const isAdmin    = canAccess(user?.role, ['Admin']);
  const isStaff    = canAccess(user?.role, ['InsuranceStaff']);
  const isHospital = canAccess(user?.role, ['Hospital']);

  // ── LIST STATE ────────────────────────────────────────────────────────────
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── FILTER STATE ──────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // ── POLICIES (for create dropdown) ────────────────────────────────────────
  const [policies, setPolicies] = useState([]);

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

  // Load active policies for the create dropdown
  useEffect(() => {
    getActivePolicies()
      .then(setPolicies)
      .catch(() => setPolicies([]));
  }, []);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── FILTERED LIST ─────────────────────────────────────────────────────────
  const filtered = members.filter((m) => {
    const matchSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.memberNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'All' || m.status === statusFilter;
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
      // Build contactInfoJSON from individual fields
      const contactInfo = {};
      if (createForm.contactPhone)   contactInfo.phone   = createForm.contactPhone;
      if (createForm.contactEmail)   contactInfo.email   = createForm.contactEmail;
      if (createForm.contactAddress) contactInfo.address = createForm.contactAddress;

      await createMember({
        policyID:        Number(createForm.policyID),
        name:            createForm.name,
        dob:             createForm.dob,
        gender:          createForm.gender,
        memberNumber:    createForm.memberNumber,
        contactInfoJSON: Object.keys(contactInfo).length > 0
                          ? JSON.stringify(contactInfo)
                          : null,
        coverageStart:   createForm.coverageStart,
        coverageEnd:     createForm.coverageEnd || null,
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
      let expireResult = null;
      try {
        expireResult = await checkExpiredMembers();
      } catch {
        // silently ignore
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

      {!loading && !error && (
        <MembersSummary members={members} />
      )}

      <MembersTable
        members={filtered}
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
      />

      <CreateModal
        show={showCreate}
        loading={createLoading}
        error={createError}
        form={createForm}
        policies={policies}
        onHide={() => setShowCreate(false)}
        onFieldChange={handleCreateField}
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