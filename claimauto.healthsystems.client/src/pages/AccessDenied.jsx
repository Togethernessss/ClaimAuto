import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import { getDashboardPath } from '../security/permissions';

export default function AccessDenied() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const attemptedPath    = location.pathname;

  const handleSignInAsOther = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{
      minHeight:       '80vh',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         '16px',
      backgroundColor: '#f3f0ff',
    }}>
      <div style={{
        maxWidth: 460,
        width:    '100%',
      }}>

        {/* ── Main card ──────────────────────────────────────── */}
        <div style={{
          background:   '#ffffff',
          borderRadius: 16,
          boxShadow:
            '0 8px 40px rgba(239,68,68,0.12),' +
            '0 2px 12px rgba(0,0,0,0.06)',
          border:   '1px solid rgba(239,68,68,0.15)',
          overflow: 'hidden',
        }}>

          {/* ── Red top strip ──────────────────────────────── */}
          <div style={{
            height:     5,
            background:
              'linear-gradient(90deg,' +
              '#ef4444 0%, #dc2626 50%, #b91c1c 100%)',
          }} />

          {/* ── Header ─────────────────────────────────────── */}
          <div style={{
            padding:      '24px 32px 18px',
            textAlign:    'center',
            background:
              'linear-gradient(180deg,' +
              '#fff5f5 0%, #ffffff 100%)',
            borderBottom: '1px solid #fee2e2',
          }}>

            {/* Icon + badge row */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            12,
              marginBottom:   12,
            }}>
              {/* Shield icon */}
              <div style={{
                width:          52,
                height:         52,
                borderRadius:   '50%',
                background:
                  'linear-gradient(135deg,' +
                  '#fee2e2 0%, #fecaca 100%)',
                border:         '2px solid #ef4444',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
              }}>
                <i className="bi bi-shield-x"
                  style={{ fontSize: 24, color: '#dc2626' }}
                />
              </div>

              {/* Title + 403 */}
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           5,
                  background:    '#fee2e2',
                  border:        '1px solid #fecaca',
                  borderRadius:  20,
                  padding:       '1px 8px',
                  fontSize:      10,
                  fontWeight:    700,
                  color:         '#dc2626',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom:  4,
                }}>
                  <i className="bi bi-slash-circle"
                    style={{ fontSize: 9 }} />
                  403 Forbidden
                </div>
                <h2 style={{
                  fontSize:   20,
                  fontWeight: 700,
                  color:      '#1e2a3a',
                  margin:     0,
                }}>
                  Access Denied
                </h2>
              </div>
            </div>

            <p style={{
              fontSize:   13,
              color:      '#6c757d',
              margin:     0,
              lineHeight: 1.5,
            }}>
              You don't have permission to view this page.
              Contact your administrator if this is a mistake.
            </p>
          </div>

          {/* ── Body ───────────────────────────────────────── */}
          <div style={{ padding: '16px 24px 24px' }}>

            {/* Attempted path + signed in as — same row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:     10,
              marginBottom: 14,
            }}>
              {/* Blocked path */}
              <div style={{
                background:   '#fff5f5',
                border:       '1px solid #fecaca',
                borderRadius: 8,
                padding:      '8px 12px',
              }}>
                <div style={{
                  fontSize:      10,
                  color:         '#9e9e9e',
                  fontWeight:    600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom:  3,
                  display:       'flex',
                  alignItems:    'center',
                  gap:           4,
                }}>
                  <i className="bi bi-lock-fill"
                    style={{ color: '#ef4444' }} />
                  Blocked path
                </div>
                <code style={{
                  fontSize:  11,
                  color:     '#dc2626',
                  fontWeight: 600,
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}>
                  {attemptedPath}
                </code>
              </div>

              {/* Signed in as */}
              {user && (
                <div style={{
                  background:   '#f8f9fa',
                  border:       '1px solid #e9ecef',
                  borderRadius: 8,
                  padding:      '8px 12px',
                }}>
                  <div style={{
                    fontSize:      10,
                    color:         '#9e9e9e',
                    fontWeight:    600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom:  3,
                    display:       'flex',
                    alignItems:    'center',
                    gap:           4,
                  }}>
                    <i className="bi bi-person-circle"
                      style={{ color: '#667eea' }} />
                    Signed in as
                  </div>
                  <div style={{
                    fontSize:   12,
                    fontWeight: 600,
                    color:      '#1e2a3a',
                    marginBottom: 2,
                  }}>
                    {user.name}
                  </div>
                  <span style={{
                    background:   '#e9ecef',
                    color:        '#6c757d',
                    fontSize:     10,
                    padding:      '1px 7px',
                    borderRadius: 20,
                    fontWeight:   600,
                  }}>
                    {user.role === 'InsuranceStaff'
                      ? 'Staff' : user.role}
                  </span>
                </div>
              )}
            </div>

            {/* Warning note */}
            <div style={{
              background:   '#fffbeb',
              border:       '1px solid #fde68a',
              borderRadius: 8,
              padding:      '8px 12px',
              marginBottom: 16,
              display:      'flex',
              gap:          8,
              alignItems:   'center',
            }}>
              <i className="bi bi-exclamation-triangle-fill"
                style={{
                  color:     '#f59e0b',
                  fontSize:  13,
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize:   11,
                color:      '#92400e',
                lineHeight: 1.4,
              }}>
                This access attempt has been logged.
                Contact your system administrator for help.
              </span>
            </div>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap:     10,
            }}>
              <button
                onClick={() =>
                  navigate(getDashboardPath(user?.role))}
                style={{
                  flex:           1,
                  background:
                    'linear-gradient(135deg,' +
                    '#667eea 0%, #764ba2 100%)',
                  border:         'none',
                  borderRadius:   8,
                  padding:        '9px 12px',
                  color:          '#ffffff',
                  fontSize:       12,
                  fontWeight:     600,
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            6,
                  boxShadow:
                    '0 3px 10px rgba(102,126,234,0.35)',
                  transition:     'opacity 0.15s',
                }}
                onMouseEnter={(e) =>
                  e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) =>
                  e.currentTarget.style.opacity = '1'}
              >
                <i className="bi bi-house-door-fill" />
                Back to Dashboard
              </button>

              <button
                onClick={handleSignInAsOther}
                style={{
                  flex:           1,
                  background:     '#ffffff',
                  border:         '1.5px solid #dee2e6',
                  borderRadius:   8,
                  padding:        '9px 12px',
                  color:          '#6c757d',
                  fontSize:       12,
                  fontWeight:     600,
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            6,
                  transition:     'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    '#f8f9fa';
                  e.currentTarget.style.borderColor =
                    '#adb5bd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    '#ffffff';
                  e.currentTarget.style.borderColor =
                    '#dee2e6';
                }}
              >
                <i className="bi bi-box-arrow-right" />
                Sign in as someone else
              </button>
            </div>

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{
          textAlign:      'center',
          marginTop:      12,
          fontSize:       11,
          color:          '#9e9e9e',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            5,
        }}>
          <i className="bi bi-shield-check"
            style={{ color: '#667eea' }} />
          Protected by ClaimAuto Security
        </div>

      </div>
    </div>
  );
}