import { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import InviteUserModal from '../../components/identity/InviteUserModal';
import { getAllUsers, updateUserStatus } from '../../services/identity/userService';

const PAGE_SIZE = 15;

const ROLE_BADGE = {
  Admin:          { bg: 'danger',  label: 'Admin' },
  InsuranceStaff: { bg: 'primary', label: 'Staff' },
  Hospital:       { bg: 'info',    label: 'Hospital' },
  Policyholder:   { bg: 'success', label: 'Policyholder' },
};

const ROLE_STYLES = {
  Admin:          { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  InsuranceStaff: { bg: '#ede9fe', color: '#5b21b6', dot: '#7c3aed' },
  Hospital:       { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Policyholder:   { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
};

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

export default function AdminUsers() {
  const { user: me } = useAuth();

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [searchText,   setSearchText]   = useState('');
  const [roleFilter,   setRoleFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  const [confirmTarget,  setConfirmTarget]  = useState(null);
  const [confirmAction,  setConfirmAction]  = useState(null);
  const [toggling,       setToggling]       = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load users.';
      setError(typeof msg === 'string' ? msg : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => { setCurrentPage(1); }, [searchText, roleFilter, statusFilter]);

  const openConfirm = (targetUser) => {
    const action = targetUser.status === 'Active' ? 'Inactive' : 'Active';
    setConfirmTarget(targetUser);
    setConfirmAction(action);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget || !confirmAction) return;
    setToggling(true);
    try {
      await updateUserStatus(confirmTarget.userID, confirmAction);
      setSuccess(
        confirmAction === 'Inactive'
          ? `${confirmTarget.name} has been deactivated and will be logged out automatically.`
          : `${confirmTarget.name}'s account has been reactivated.`
      );
      setConfirmTarget(null);
      setConfirmAction(null);
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to update status.';
      setError(typeof msg === 'string' ? msg : 'Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchText =
      !searchText ||
      u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchText.toLowerCase());
    const matchRole   = roleFilter   === 'All' || u.role   === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchText && matchRole && matchStatus;
  });

  const totalActive   = users.filter((u) => u.status === 'Active').length;
  const totalInactive = users.filter((u) => u.status === 'Inactive').length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeePage  = Math.min(currentPage, totalPages);
  const startIdx   = (safeePage - 1) * PAGE_SIZE;
  const endIdx     = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const pagedUsers = filtered.slice(startIdx, endIdx);

  // Summary cards data
  const summaryCards = [
    { label: 'Total Users',   value: users.length,   icon: 'bi-people-fill',      color: '#667eea', bg: '#f3f0ff', border: '#667eea' },
    { label: 'Active',        value: totalActive,    icon: 'bi-person-check-fill', color: '#10b981', bg: '#d1fae5', border: '#10b981' },
    { label: 'Inactive',      value: totalInactive,  icon: 'bi-person-dash-fill',  color: '#ef4444', bg: '#fee2e2', border: '#ef4444' },
    { label: 'Admins',        value: users.filter(u => u.role === 'Admin').length, icon: 'bi-shield-check-fill', color: '#f59e0b', bg: '#fef3c7', border: '#f59e0b' },
  ];

  // Grid column definition for the custom table
  const gridCols = '2fr 2fr 130px 110px 80px 100px 120px';

  return (
    <Container fluid>

      {/* ── Gradient Header Banner ──────────────────────────────────── */}
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '22px 28px',
          boxShadow: '0 8px 32px rgba(102,126,234,0.35)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -40, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -50, left: '38%', pointerEvents: 'none' }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative' }}>
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)',
            }}>
              <i className="bi bi-people-fill" style={{ fontSize: '1.4rem', color: 'white' }}></i>
            </div>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: 'white', letterSpacing: '-0.3px' }}>
                User Management
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                Manage all stakeholders · activate or deactivate accounts
                {!loading && (
                  <strong style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {' '}· {users.length} user{users.length !== 1 ? 's' : ''} total
                  </strong>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              onClick={() => fetchUsers()}
              disabled={loading}
              style={{
                padding: '7px 14px', borderRadius: 10,
                border: '1.5px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.14)', color: 'white',
                fontSize: '0.82rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)', opacity: loading ? 0.6 : 1, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            >
              <i className="bi bi-arrow-clockwise"></i>Refresh
            </button>
            <button
              onClick={() => setShowInvite(true)}
              style={{
                padding: '7px 16px', borderRadius: 10,
                border: '1.5px solid rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.22)', color: 'white',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.32)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            >
              <i className="bi bi-envelope-plus"></i>Invite User
            </button>
          </div>
        </div>
      </div>

      {/* ── Success / Error Toasts ──────────────────────────────────── */}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#d1fae5', border: '1px solid #6ee7b7',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: '#065f46', fontWeight: 500,
        }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>
          {success}
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: 14 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: '#991b1b', fontWeight: 500,
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 14 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {summaryCards.map((c) => (
          <div key={c.label} style={{
            background: 'white', borderRadius: 12,
            borderLeft: `4px solid ${c.border}`,
            padding: '14px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className={`bi ${c.icon}`} style={{ fontSize: '1.1rem', color: c.color }}></i>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.color, lineHeight: 1.1 }}>
                {loading ? <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>—</span> : c.value}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#6b7280', fontWeight: 500, marginTop: 1 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.8rem' }}></i>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
              border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.83rem',
              outline: 'none', color: '#374151', background: '#f9fafb',
            }}
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.83rem', background: '#f9fafb', color: '#374151', outline: 'none', minWidth: 140 }}
        >
          <option value="All">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="InsuranceStaff">Insurance Staff</option>
          <option value="Hospital">Hospital</option>
          <option value="Policyholder">Policyholder</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.83rem', background: '#f9fafb', color: '#374151', outline: 'none', minWidth: 120 }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {/* Count */}
        {!loading && (
          <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
          </span>
        )}

        {/* Clear filters */}
        {(searchText || roleFilter !== 'All' || statusFilter !== 'All') && (
          <button
            onClick={() => { setSearchText(''); setRoleFilter('All'); setStatusFilter('All'); }}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: 'white',
              color: '#6b7280', fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <i className="bi bi-x-circle"></i>Clear
          </button>
        )}
      </div>

      {/* ── Users Table ─────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(118,75,162,0.08)',
        background: 'white', marginBottom: 16,
      }}>
        {/* Gradient header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '12px 16px',
        }}>
          {['Name', 'Email', 'Role', 'Status', 'MFA', 'Joined', 'Actions'].map((h, i) => (
            <div key={h} style={{
              fontSize: '0.72rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
              textAlign: i === 6 ? 'right' : 'left',
              paddingLeft: i === 0 ? 4 : 0,
            }}>{h}</div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Spinner animation="border" variant="light" size="sm" />
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading users…</div>
          </div>
        )}

        {/* Empty */}
        {!loading && pagedUsers.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-people" style={{ fontSize: 40, color: '#d1d5db' }}></i>
            <div style={{ color: '#6b7280', marginTop: 10, fontSize: '0.85rem' }}>No users match your filters.</div>
          </div>
        )}

        {/* Rows */}
        {!loading && pagedUsers.map((u, idx) => {
          const isSelf   = u.userID === me?.userID;
          const isActive = u.status === 'Active';
          const rs = ROLE_STYLES[u.role] || { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' };
          return (
            <div key={u.userID} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              padding: '11px 16px', alignItems: 'center',
              borderBottom: idx < pagedUsers.length - 1 ? '1px solid #f3f0ff' : 'none',
              background: 'white', opacity: isActive ? 1 : 0.65,
              transition: 'background 0.12s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#faf9ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              {/* Name + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.82rem',
                }}>
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1f2937', lineHeight: 1.2 }}>{u.name}</div>
                  {isSelf && <div style={{ fontSize: '0.7rem', color: '#7c3aed' }}>You</div>}
                </div>
              </div>

              {/* Email */}
              <div style={{ fontSize: '0.82rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>

              {/* Role pill */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: rs.bg, color: rs.color,
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: rs.dot, flexShrink: 0 }} />
                  {ROLE_BADGE[u.role]?.label || u.role}
                </span>
              </div>

              {/* Status pill */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: isActive ? '#d1fae5' : '#fee2e2',
                  color: isActive ? '#065f46' : '#991b1b',
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: '0.73rem', fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                  {u.status}
                </span>
              </div>

              {/* MFA */}
              <div>
                {u.mfaEnabled
                  ? <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><i className="bi bi-shield-check"></i>On</span>
                  : <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}><i className="bi bi-shield"></i>Off</span>
                }
              </div>

              {/* Joined date */}
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                {u.createdAt ? new Date(u.createdAt.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(u.createdAt) ? u.createdAt : u.createdAt + 'Z').toLocaleDateString() : '—'}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {isSelf ? (
                  <span style={{ fontSize: '0.78rem', color: '#d1d5db' }}>—</span>
                ) : (
                  <button
                    onClick={() => openConfirm(u)}
                    title={isActive ? 'Deactivate account' : 'Reactivate account'}
                    style={{
                      padding: '4px 12px', borderRadius: 7, border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: isActive ? '#fee2e2' : '#d1fae5',
                      color: isActive ? '#dc2626' : '#065f46',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isActive ? '#dc2626' : '#10b981'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? '#fee2e2' : '#d1fae5'; e.currentTarget.style.color = isActive ? '#dc2626' : '#065f46'; }}
                  >
                    {isActive
                      ? <><i className="bi bi-person-dash"></i>Deactivate</>
                      : <><i className="bi bi-person-check"></i>Activate</>
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        {!loading && pagedUsers.length > 0 && (
          <div style={{
            padding: '10px 20px', borderTop: '1px solid #f3f0ff',
            background: '#faf9ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              Showing {startIdx + 1}–{endIdx} of {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              <i className="bi bi-shield me-1"></i>{totalActive} active · {totalInactive} inactive
            </span>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}<strong>{filtered.length}</strong> total user{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="d-flex align-items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeePage === 1}
              style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === 1 ? '#f8fafc' : 'white', color: safeePage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === 1 ? 'not-allowed' : 'pointer' }}>
              <i className="bi bi-chevron-left me-1"></i>Prev
            </button>
            {getPageNumbers(safeePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`e-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ width: 36, height: 34, borderRadius: 8, border: safeePage === p ? 'none' : '1px solid #e2e8f0', background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: safeePage === p ? 'white' : '#475569', fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500, cursor: 'pointer', boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none' }}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeePage === totalPages}
              style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === totalPages ? '#f8fafc' : 'white', color: safeePage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === totalPages ? 'not-allowed' : 'pointer' }}>
              Next<i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Toggle Modal ─────────────────────────────────────── */}
      <Modal show={!!confirmTarget} onHide={() => !toggling && setConfirmTarget(null)} centered>
        <Modal.Header closeButton={!toggling}>
          <Modal.Title>
            {confirmAction === 'Inactive' ? (
              <><i className="bi bi-person-dash text-danger me-2"></i>Deactivate Account</>
            ) : (
              <><i className="bi bi-person-check text-success me-2"></i>Activate Account</>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmAction === 'Inactive' ? (
            <>
              <p>Are you sure you want to <strong>deactivate</strong>{' '}<strong>{confirmTarget?.name}</strong>?</p>
              <Alert variant="warning" className="small mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This user will be <strong>logged out automatically</strong> and will see a message to contact support. They will not be able to log in until reactivated.
              </Alert>
            </>
          ) : (
            <p>Reactivate <strong>{confirmTarget?.name}</strong>? They will regain full access to the platform immediately.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setConfirmTarget(null)} disabled={toggling}>Cancel</button>
          <button
            className={`btn btn-${confirmAction === 'Inactive' ? 'danger' : 'success'}`}
            onClick={handleConfirmToggle}
            disabled={toggling}
          >
            {toggling ? (
              <><Spinner animation="border" size="sm" className="me-1" />Processing…</>
            ) : confirmAction === 'Inactive' ? (
              <><i className="bi bi-person-dash me-1"></i>Yes, Deactivate</>
            ) : (
              <><i className="bi bi-person-check me-1"></i>Yes, Activate</>
            )}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ── Invite modal ─────────────────────────────────────────────── */}
      <InviteUserModal
        show={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={() => { setShowInvite(false); fetchUsers(); }}
      />
    </Container>
  );
}
