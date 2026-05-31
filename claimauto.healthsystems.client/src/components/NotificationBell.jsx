import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { markAllAsRead } from '../services/notifications/notificationService';
import { useNotifications } from '../security/NotificationContext';
import { useAuth } from '../security/AuthContext';
import { getPagePath } from '../security/permissions';

// ── UTC fix: add Z if missing so browser treats as UTC ────────
function timeAgo(iso) {
  const utcIso = iso && !iso.endsWith('Z') ? iso + 'Z' : iso;
  const diff   = Math.floor((Date.now() - new Date(utcIso)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function categoryStyle(cat) {
  switch (cat) {
    // Existing
    case 'Payment':   return { bg: '#d1f2eb', color: '#085041' };
    case 'Appeal':    return { bg: '#f3e8ff', color: '#6b21a8' };
    case 'Exception': return { bg: '#e5e7eb', color: '#374151' };
    // New domain categories
    case 'Claim':     return { bg: '#dbeafe', color: '#1e40af' };
    case 'Document':  return { bg: '#fef3c7', color: '#92400e' };
    case 'Fraud':     return { bg: '#fecaca', color: '#991b1b' };
    case 'Policy':    return { bg: '#e0e7ff', color: '#3730a3' };
    case 'Account':   return { bg: '#ccfbf1', color: '#115e59' };
    case 'Member':    return { bg: '#f5f5f4', color: '#44403c' };
    default:          return { bg: '#e2e3e5', color: '#41464b' };
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount, unreadList, loading, refresh } =
    useNotifications();
  const [open,    setOpen]    = useState(false);
  const dropdownRef           = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current &&
          !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      refresh();
    } catch {}
  }

  function handleViewAll() {
    setOpen(false);
    navigate(getPagePath(user?.role, '/notifications'));
  }

  function handleNotificationClick() {
    setOpen(false);
    navigate(getPagePath(user?.role, '/notifications'));
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', position: 'relative',
          padding: '4px 6px',
          display: 'flex', alignItems: 'center',
        }}
      >
        <i className="bi bi-bell"
          style={{ fontSize: 22, color: 'white' }}></i>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef4444', color: 'white',
            fontSize: 10, fontWeight: 600,
            borderRadius: '50%',
            width: 18, height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #764ba2',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0,
          width: 360, background: 'white',
          border: '0.5px solid #dee2e6',
          borderRadius: 12, zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '0.5px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: '#1e2a3a',
              }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 11, color: '#6c757d',
                  marginLeft: 8,
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 12, color: '#667eea',
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 500,
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-4 text-muted small">
                Loading...
              </div>
            ) : unreadList.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
              }}>
                <i className="bi bi-bell-slash"
                  style={{ fontSize: 32, color: '#dfe4ea' }}>
                </i>
                <div style={{
                  fontSize: 13, color: '#6c757d',
                  marginTop: 8,
                }}>
                  No unread notifications
                </div>
              </div>
            ) : (
              unreadList.slice(0, 5).map((n) => {
                const cs = categoryStyle(n.category);
                return (
                  <div
                    key={n.notificationID}
                    onClick={handleNotificationClick}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '0.5px solid #f0f0f0',
                      background: '#f3f0ff',
                      cursor: 'pointer',
                      display: 'flex', gap: 10,
                      alignItems: 'flex-start',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) =>
                      e.currentTarget.style.background =
                        '#ebe8ff'}
                    onMouseLeave={(e) =>
                      e.currentTarget.style.background =
                        '#f3f0ff'}
                  >
                    <div style={{
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: '#667eea',
                      flexShrink: 0, marginTop: 4,
                    }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        color: '#1e2a3a',
                        lineHeight: 1.4,
                      }}>
                        {n.message}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                      }}>
                        <span style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 20,
                          fontWeight: 500,
                          background: cs.bg,
                          color: cs.color,
                        }}>
                          {n.category}
                        </span>
                        <span style={{
                          fontSize: 11,
                          color: '#6c757d',
                        }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '0.5px solid #dee2e6',
            textAlign: 'center',
          }}>
            <button
              onClick={handleViewAll}
              style={{
                fontSize: 13, color: '#667eea',
                background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              View all notifications
              <i className="bi bi-arrow-right ms-1"
                style={{ fontSize: 12 }}></i>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}