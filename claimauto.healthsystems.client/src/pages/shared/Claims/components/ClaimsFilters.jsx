// src/pages/shared/Claims/components/ClaimsFilters.jsx
import { CLAIM_STATUSES, CLAIM_PRIORITIES, statusLabel } from '../utils/claimHelpers';

export default function ClaimsFilters({
  search,
  statusFilter,
  priorityFilter,
  filteredCount,
  totalCount,
  loading,
  isAdmin,
  isStaff,
  isPolicyholder,
  segmentFilter,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSegmentReset,
}) {
  const hasFilters = !!search
    || statusFilter !== 'All'
    || priorityFilter !== 'All'
    || (isPolicyholder && segmentFilter !== 'all');

  const handleClearAll = () => {
    onSearchChange('');
    onStatusChange('All');
    onPriorityChange('All');
    if (isPolicyholder) onSegmentReset?.();
  };

  // ── Input shared style ──────────────────────────────────────
  const inputStyle = {
    borderRadius:    8,
    fontSize:        13,
    borderColor:     '#e5e7eb',
    height:          38,
    paddingLeft:     10,
    outline:         'none',
    boxShadow:       'none',
    transition:      'border-color 0.15s',
    width:           '100%',
    border:          '1.5px solid #e5e7eb',
    background:      'white',
    color:           '#374151',
  };

  return (
    <div
      style={{
        background:   'white',
        borderRadius: 16,
        boxShadow:    '0 2px 16px rgba(0,0,0,0.07)',
        marginBottom: 20,
        overflow:     'hidden',
      }}
    >
      {/* ── Gradient header ──────────────────────────────────────── */}
      <div
        style={{
          background:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding:        '10px 18px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="bi bi-funnel-fill" style={{ color: 'white', fontSize: 12 }}></i>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.3px' }}>
            Search &amp; Filter Claims
          </span>
        </div>

        {/* Right side: result count + filters-active badge */}
        <div className="d-flex align-items-center gap-2">
          {!loading && (
            <span style={{
              color:    'rgba(255,255,255,0.75)',
              fontSize: '0.75rem',
            }}>
              <strong style={{ color: 'white' }}>{filteredCount}</strong>
              {' '}/{' '}
              <strong style={{ color: 'white' }}>{totalCount}</strong>
              {' '}claim{totalCount !== 1 ? 's' : ''}
            </span>
          )}
          {hasFilters && (
            <span style={{
              background:    'rgba(255,255,255,0.2)',
              color:         'white',
              fontSize:      '0.68rem',
              fontWeight:    700,
              padding:       '2px 9px',
              borderRadius:  20,
              letterSpacing: '0.5px',
            }}>
              FILTERED
            </span>
          )}
        </div>
      </div>

      {/* ── Filter controls ───────────────────────────────────────── */}
      <div style={{ padding: '14px 18px' }}>
        <div className="d-flex flex-wrap gap-2 align-items-end">

          {/* ── Search ──────────────────────────────────────────── */}
          <div style={{ flex: isPolicyholder ? '1 1 260px' : '1 1 200px', minWidth: 160 }}>
            <label style={{
              fontSize: 10, fontWeight: 700, color: '#4c1d95',
              textTransform: 'uppercase', letterSpacing: '0.6px',
              marginBottom: 5, display: 'block',
            }}>
              <i className="bi bi-search me-1"></i>Search
            </label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-search" style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)',
                color: '#a78bfa', fontSize: 12, pointerEvents: 'none',
              }}></i>
              <input
                type="text"
                className="form-control"
                placeholder={
                  isPolicyholder
                    ? 'Search by claim ID or hospital name…'
                    : 'Search by claim ID, member, or provider…'
                }
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 30 }}
                onFocus={(e)  => { e.target.style.borderColor = '#a78bfa'; }}
                onBlur={(e)   => { e.target.style.borderColor = '#e5e7eb'; }}
              />
            </div>
          </div>

          {/* ── Status filter — hidden for Policyholder ─────────── */}
          {!isPolicyholder && (
            <div style={{ flex: '0 0 150px' }}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: '#4c1d95',
                textTransform: 'uppercase', letterSpacing: '0.6px',
                marginBottom: 5, display: 'block',
              }}>
                <i className="bi bi-circle-half me-1"></i>Status
              </label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#a78bfa'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; }}
              >
                <option value="All">All Statuses</option>
                {CLAIM_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Priority filter — Admin + Staff only ─────────────── */}
          {(isAdmin || isStaff) && (
            <div style={{ flex: '0 0 150px' }}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: '#4c1d95',
                textTransform: 'uppercase', letterSpacing: '0.6px',
                marginBottom: 5, display: 'block',
              }}>
                <i className="bi bi-lightning-fill me-1"></i>Priority
              </label>
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => onPriorityChange(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#a78bfa'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; }}
              >
                <option value="All">All Priorities</option>
                {CLAIM_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Clear filters button ─────────────────────────────── */}
          {hasFilters && (
            <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
              <button
                onClick={handleClearAll}
                style={{
                  height:       38,
                  padding:      '0 14px',
                  borderRadius: 8,
                  border:       '1.5px solid #fecaca',
                  background:   '#fef2f2',
                  color:        '#dc2626',
                  fontSize:     13,
                  fontWeight:   600,
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          5,
                  transition:   'all 0.15s',
                  whiteSpace:   'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.borderColor = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fecaca';
                }}
              >
                <i className="bi bi-x-lg" style={{ fontSize: 11 }}></i>
                Clear filters
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
