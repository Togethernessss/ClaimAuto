import { useState } from 'react';

const RESOURCE_TYPES = [
  '', 'User', 'Claim', 'ClaimLine', 'ClaimDocument', 'Policy',
  'Member', 'Rule', 'Adjudication', 'Payment', 'Appeal',
  'Notification', 'Task', 'FraudCase',
];

const LIMIT_OPTIONS = [50, 100, 250, 500, 1000];

// Props:
//   onSearch(filters)  — called when user clicks Search
//   onClear()          — called when user clicks Clear
//   loading            — disables the buttons while a fetch is in progress
export default function AuditLogFilters({ onSearch, onClear, loading }) {
  const [userName,     setUserName]     = useState('');
  const [userId,       setUserId]       = useState('');
  const [resourceType, setResourceType] = useState('');
  const [action,       setAction]       = useState('');
  const [limit,        setLimit]        = useState(500);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch({
      userName:     userName.trim()  || undefined,   // client-side filter
      userId:       userId.trim()    ? parseInt(userId, 10) : undefined,
      resourceType: resourceType     || undefined,
      action:       action.trim()    || undefined,
      limit,
    });
  };

  const handleClear = () => {
    setUserName('');
    setUserId('');
    setResourceType('');
    setAction('');
    setLimit(500);
    onClear();
  };

  const hasValue = userName || userId || resourceType || action;

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
          background:  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding:     '12px 20px',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-funnel-fill" style={{ color: 'white', fontSize: 13 }}></i>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.4px' }}>
            Search &amp; Filter Logs
          </span>
        </div>
        {hasValue && (
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              color:      'white',
              fontSize:   '0.68rem',
              fontWeight: 600,
              padding:    '2px 10px',
              borderRadius: 20,
              letterSpacing: '0.5px',
            }}
          >
            FILTERS ACTIVE
          </span>
        )}
      </div>

      {/* ── Filter form ───────────────────────────────────────────── */}
      <form onSubmit={handleSearch} style={{ padding: '16px 20px' }}>
        <div className="row g-3 align-items-end">

          {/* ── User Name — new: client-side search by name ──────── */}
          <div className="col-md-3">
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
            >
              <i className="bi bi-person-fill me-1"></i>User Name
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="bi bi-search"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a78bfa', fontSize: 12, pointerEvents: 'none' }}
              ></i>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{ paddingLeft: 30, borderRadius: 8, fontSize: 13, borderColor: '#e5e7eb', height: 38 }}
              />
            </div>
          </div>

          {/* ── User ID ──────────────────────────────────────────── */}
          <div className="col-md-2">
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
            >
              <i className="bi bi-hash me-1"></i>User ID
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              placeholder="e.g. 3"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13, borderColor: '#e5e7eb', height: 38 }}
            />
          </div>

          {/* ── Resource Type ─────────────────────────────────────── */}
          <div className="col-md-2">
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
            >
              <i className="bi bi-layers me-1"></i>Resource
            </label>
            <select
              className="form-select"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13, borderColor: '#e5e7eb', height: 38 }}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t || 'all'} value={t}>{t || 'All Types'}</option>
              ))}
            </select>
          </div>

          {/* ── Action ───────────────────────────────────────────── */}
          <div className="col-md-2">
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
            >
              <i className="bi bi-lightning-fill me-1"></i>Action
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Login"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13, borderColor: '#e5e7eb', height: 38 }}
            />
          </div>

          {/* ── Limit ────────────────────────────────────────────── */}
          <div className="col-md-1">
            <label
              className="form-label"
              style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
            >
              <i className="bi bi-list-ol me-1"></i>Limit
            </label>
            <select
              className="form-select"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              style={{ borderRadius: 8, fontSize: 13, borderColor: '#e5e7eb', height: 38 }}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* ── Search + Clear buttons ────────────────────────────── */}
          <div className="col-md-2 d-flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn flex-grow-1 fw-semibold text-white"
              style={{
                background:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border:       'none',
                borderRadius: 8,
                fontSize:     13,
                height:       38,
                boxShadow:    '0 2px 8px rgba(102,126,234,0.35)',
                opacity:      loading ? 0.65 : 1,
              }}
            >
              <i className="bi bi-search me-1"></i>Search
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleClear}
              title="Clear all filters"
              style={{
                width:        38,
                height:       38,
                borderRadius: 8,
                border:       '1.5px solid #e5e7eb',
                background:   hasValue ? '#fef2f2' : 'white',
                color:        hasValue ? '#dc2626' : '#64748b',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                flexShrink:   0,
                fontSize:     14,
                transition:   'all 0.15s',
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
