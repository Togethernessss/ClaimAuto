import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import { getMenuForRole } from '../security/permissions';
import { getAllAppeals } from '../services/appeals/appealService';

// Role-chip colours (shown in the user mini-profile)
const ROLE_CHIP = {
  Admin:          { label: 'Admin',   color: '#fca5a5', bg: 'rgba(239,68,68,0.18)' },
  InsuranceStaff: { label: 'Staff',   color: '#fcd34d', bg: 'rgba(245,158,11,0.18)' },
  Hospital:       { label: 'Hospital',color: '#93c5fd', bg: 'rgba(59,130,246,0.18)' },
  Policyholder:   { label: 'Member',  color: '#6ee7b7', bg: 'rgba(16,185,129,0.18)' },
};

export default function Sidebar({ collapsed = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeAppealCount, setActiveAppealCount] = useState(0);

  const isStaff = user?.role === 'Admin' || user?.role === 'InsuranceStaff';

  const fetchAppealCount = useCallback(async () => {
    try {
      const data   = await getAllAppeals();
      const active = data.filter(
        (a) => a.status === 'Filed' || a.status === 'UnderReview'
      ).length;
      setActiveAppealCount(active);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAppealCount();
    const interval = setInterval(fetchAppealCount, 30000);
    return () => clearInterval(interval);
  }, [fetchAppealCount]);

  if (!user) return null;

  const menu     = getMenuForRole(user.role);
  const initials = user.name
    ? user.name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const chip = ROLE_CHIP[user.role] ?? { label: user.role, color: '#c4b5fd', bg: 'rgba(139,92,246,0.18)' };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside
      style={{
        width:         '100%',
        minHeight:     '100%',
        background:    'linear-gradient(180deg, #1e1b4b 0%, #1a1535 55%, #16103c 100%)',
        display:       'flex',
        flexDirection: 'column',
        padding:       collapsed ? '18px 8px 14px' : '18px 12px 14px',
        position:      'relative',
        overflow:      'hidden',
        transition:    'padding 0.3s ease',
      }}
    >
      {/* ── Scoped styles ──────────────────────────────────────────── */}
      <style>{`
        .snl {
          display:         flex;
          align-items:     center;
          gap:             10px;
          padding:         9px 12px;
          margin-bottom:   3px;
          border-radius:   12px;
          font-size:       13.5px;
          font-weight:     500;
          color:           rgba(255,255,255,0.55);
          text-decoration: none;
          transition:      all 0.18s ease;
          cursor:          pointer;
          position:        relative;
        }
        .snl:hover {
          background: rgba(255,255,255,0.07);
          color:      rgba(255,255,255,0.88);
        }
        .snl.active {
          background:  linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color:       white;
          font-weight: 700;
          box-shadow:  0 3px 12px rgba(102,126,234,0.45);
        }
        .snl .sni {
          width:           30px;
          height:          30px;
          border-radius:   9px;
          display:         flex;
          align-items:     center;
          justify-content: center;
          background:      rgba(255,255,255,0.06);
          flex-shrink:     0;
          transition:      background 0.18s;
        }
        .snl:hover .sni    { background: rgba(255,255,255,0.10); }
        .snl.active .sni   { background: rgba(255,255,255,0.18); }
        .snl .sni i        { font-size: 13px; color: rgba(255,255,255,0.45); transition: color 0.18s; }
        .snl:hover .sni i  { color: rgba(255,255,255,0.85); }
        .snl.active .sni i { color: white; }

        /* ── Collapsed state overrides ─────────────────────────── */
        .snl-collapsed {
          justify-content: center;
          padding:         9px 4px;
          gap:             0;
        }
        .snl-collapsed .sni {
          width:  36px;
          height: 36px;
        }
        .snl-collapsed .sni i { font-size: 15px; }
      `}</style>

      {/* ── Decorative orbs ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(102,126,234,0.07)',
        top: -70, right: -50,
      }} />
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        width: 110, height: 110, borderRadius: '50%',
        background: 'rgba(118,75,162,0.06)',
        bottom: 90, left: -40,
      }} />

      {/* ── User mini-profile ────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap:            collapsed ? 0 : 10,
        padding:        `8px 10px ${collapsed ? 10 : 14}px`,
        borderBottom:   '1px solid rgba(255,255,255,0.08)',
        marginBottom:   12,
        position:       'relative',
        transition:     'all 0.3s ease',
      }}>
        {/* Avatar circle — tap to open profile page. Shows photo if set, else initials. */}
        <div
          onClick={() => navigate('/profile')}
          title={user.name || user.email || 'Profile'}
          style={{
            width:          38, height: 38,
            borderRadius:   '50%',
            flexShrink:     0,
            background:     user.profilePhoto
              ? 'transparent'
              : 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       13,
            fontWeight:     800,
            color:          'white',
            boxShadow:      '0 3px 10px rgba(102,126,234,0.55)',
            border:         '2px solid rgba(255,255,255,0.15)',
            letterSpacing:  0.5,
            cursor:         'pointer',
            overflow:       'hidden',
          }}>
          {user.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt="Profile"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }}
            />
          ) : initials}
        </div>

        {/* Name + role — hidden when collapsed */}
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{
              color:        'white',
              fontWeight:   600,
              fontSize:     13,
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user.name || user.email}
            </div>
            <span style={{
              display:      'inline-block',
              marginTop:    3,
              background:   chip.bg,
              color:        chip.color,
              fontSize:     10,
              fontWeight:   700,
              padding:      '1px 9px',
              borderRadius: 20,
              letterSpacing: '0.3px',
            }}>
              {chip.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Menu items ───────────────────────────────────────────── */}
      <nav style={{ flex: 1 }}>
        {menu.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `snl${collapsed ? ' snl-collapsed' : ''}${isActive ? ' active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sni">
              <i className={item.icon}></i>
            </span>

            {/* Label + badge — hidden when collapsed */}
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>{item.label}</span>

                {item.key === 'appeals' && activeAppealCount > 0 && isStaff && (
                  <span style={{
                    background:   '#ef4444',
                    color:        'white',
                    fontSize:     10,
                    fontWeight:   700,
                    borderRadius: 20,
                    padding:      '1px 7px',
                    minWidth:     20,
                    textAlign:    'center',
                    boxShadow:    '0 2px 6px rgba(239,68,68,0.45)',
                    flexShrink:   0,
                  }}>
                    {activeAppealCount > 99 ? '99+' : activeAppealCount}
                  </span>
                )}
              </>
            )}

            {/* Collapsed: tiny red dot indicator for appeals badge */}
            {collapsed && item.key === 'appeals' && activeAppealCount > 0 && isStaff && (
              <span style={{
                position:     'absolute',
                top:          4,
                right:        4,
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   '#ef4444',
                border:       '1.5px solid #1a1535',
                boxShadow:    '0 0 4px rgba(239,68,68,0.6)',
              }} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        margin:    '10px 4px 8px',
      }} />

      {/* ── Logout button ────────────────────────────────────────── */}
      <button
        onClick={handleLogout}
        title={collapsed ? 'Logout' : undefined}
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             collapsed ? 0 : 8,
          width:           '100%',
          padding:         collapsed ? '9px 4px' : '9px 12px',
          borderRadius:    12,
          border:          '1px solid rgba(239,68,68,0.28)',
          background:      'rgba(239,68,68,0.08)',
          color:           '#f87171',
          fontSize:        13.5,
          fontWeight:      600,
          cursor:          'pointer',
          transition:      'all 0.18s ease',
          marginBottom:    8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background  = 'rgba(239,68,68,0.2)';
          e.currentTarget.style.color       = '#fca5a5';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background  = 'rgba(239,68,68,0.08)';
          e.currentTarget.style.color       = '#f87171';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)';
        }}
      >
        <i className="bi bi-box-arrow-right" style={{ fontSize: collapsed ? 16 : 14 }}></i>
        {!collapsed && 'Logout'}
      </button>

      {/* ── Footer — hidden when collapsed ───────────────────────── */}
      {!collapsed && (
        <div style={{
          textAlign:     'center',
          fontSize:      10,
          color:         'rgba(255,255,255,0.18)',
          letterSpacing: '0.4px',
        }}>
          ClaimAuto &nbsp;·&nbsp; {menu.length} page{menu.length !== 1 ? 's' : ''}
        </div>
      )}
    </aside>
  );
}
