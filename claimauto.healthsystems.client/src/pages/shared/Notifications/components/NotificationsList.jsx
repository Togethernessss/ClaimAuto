// src/pages/shared/Notifications/components/NotificationsList.jsx
import { Spinner } from 'react-bootstrap';

function timeAgo(iso) {
  const utcIso = iso && !iso.endsWith('Z') ? iso + 'Z' : iso;
  const diff   = Math.floor((Date.now() - new Date(utcIso)) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(utcIso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const CATEGORY_STYLES = {
  // Existing (kept; Appeal recolored to purple to free blue for Claim)
  Payment:   { bg: '#d1fae5', color: '#065f46', icon: 'bi-cash-coin',            dot: '#10b981' },
  Appeal:    { bg: '#f3e8ff', color: '#6b21a8', icon: 'bi-megaphone',            dot: '#a855f7' },
  Exception: { bg: '#e5e7eb', color: '#374151', icon: 'bi-exclamation-triangle', dot: '#6b7280' },
  // New domain categories
  Claim:     { bg: '#dbeafe', color: '#1e40af', icon: 'bi-file-earmark-medical', dot: '#3b82f6' },
  Document:  { bg: '#fef3c7', color: '#92400e', icon: 'bi-file-earmark-text',    dot: '#f59e0b' },
  Fraud:     { bg: '#fecaca', color: '#991b1b', icon: 'bi-shield-exclamation',   dot: '#ef4444' },
  Policy:    { bg: '#e0e7ff', color: '#3730a3', icon: 'bi-calendar-event',       dot: '#6366f1' },
  Account:   { bg: '#ccfbf1', color: '#115e59', icon: 'bi-shield-lock',          dot: '#14b8a6' },
  Member:    { bg: '#f5f5f4', color: '#44403c', icon: 'bi-person-vcard',         dot: '#78716c' },
  default:   { bg: '#f3f4f6', color: '#374151', icon: 'bi-bell',                 dot: '#9ca3af' },
};

const SEVERITY_STYLES = {
  Info:     { bg: '#dbeafe', color: '#1e40af', icon: 'bi-info-circle-fill' },
  Warning:  { bg: '#fef3c7', color: '#92400e', icon: 'bi-exclamation-triangle-fill' },
  Critical: { bg: '#fee2e2', color: '#991b1b', icon: 'bi-exclamation-octagon-fill' },
  default:  { bg: '#f3f4f6', color: '#6b7280', icon: 'bi-bell-fill' },
};

export default function NotificationsList({
  notifications,
  loading,
  error,
  actionLoading,
  onRetry,
  onMarkRead,
  onDismiss,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="text-center py-5">
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Spinner animation="border" variant="light" size="sm" />
        </div>
        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading notifications…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff5f5', border: '1px solid #fca5a5',
        borderRadius: 12, padding: '14px 18px',
      }}>
        <i className="bi bi-exclamation-triangle-fill text-danger fs-5 flex-shrink-0"></i>
        <div style={{ flex: 1, color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>
        <button onClick={onRetry} style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          color: '#dc2626', borderRadius: 20, padding: '4px 14px',
          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <i className="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 2px 16px rgba(118,75,162,0.08)',
        padding: '48px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
          border: '2px solid #ede9fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <i className="bi bi-bell-slash" style={{ fontSize: '1.6rem', color: '#7c3aed' }}></i>
        </div>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No notifications found</div>
        <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>You're all caught up! Nothing to show here.</div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(118,75,162,0.08)',
      background: 'white',
    }}>
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <i className="bi bi-bell-fill me-2"></i>Notifications
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.2)', color: 'white',
          fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
        }}>
          {notifications.length} item{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notification items */}
      {notifications.map((n, index) => {
        const cs  = CATEGORY_STYLES[n.category]  || CATEGORY_STYLES.default;
        const svs = SEVERITY_STYLES[n.severity]  || SEVERITY_STYLES.default;
        const isLoading   = actionLoading === n.notificationID;
        const isDismissed = n.status === 'Dismissed';
        const isUnread    = n.status === 'Unread';

        return (
          <div
            key={n.notificationID}
            style={{
              padding: '14px 18px',
              borderBottom: index < notifications.length - 1 ? '1px solid #f3f0ff' : 'none',
              background: isUnread ? '#faf9ff' : 'white',
              display: 'flex', gap: 14, alignItems: 'flex-start',
              opacity: isDismissed ? 0.65 : 1,
              transition: 'background 0.12s',
              borderLeft: isUnread ? '3px solid #7c3aed' : '3px solid transparent',
            }}
          >
            {/* Category icon badge */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: cs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`bi ${cs.icon}`} style={{ color: cs.color, fontSize: '0.9rem' }}></i>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem', lineHeight: 1.5,
                fontWeight: isUnread ? 600 : 400,
                color: isDismissed ? '#9ca3af' : '#1f2937',
                textDecoration: isDismissed ? 'line-through' : 'none',
              }}>
                {n.message}
              </div>

              {n.claimID && (
                <div style={{ fontSize: '0.73rem', color: '#7c3aed', marginTop: 3, fontWeight: 500 }}>
                  <i className="bi bi-folder2 me-1"></i>Claim #{n.claimID}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Category pill */}
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                  fontWeight: 600, background: cs.bg, color: cs.color,
                }}>
                  {n.category}
                </span>
                {/* Severity pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                  fontWeight: 600, background: svs.bg, color: svs.color,
                }}>
                  <i className={`bi ${svs.icon}`} style={{ fontSize: '0.62rem' }}></i>
                  {n.severity}
                </span>
                {/* Time */}
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  <i className="bi bi-clock me-1" style={{ fontSize: '0.62rem' }}></i>
                  {timeAgo(n.createdAt)}
                </span>
                {/* Unread dot */}
                {isUnread && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
                    Unread
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {isLoading ? (
                <Spinner animation="border" size="sm" style={{ color: '#7c3aed' }} />
              ) : (
                <>
                  {isUnread && (
                    <button
                      onClick={() => onMarkRead(n.notificationID)}
                      style={{
                        fontSize: '0.73rem', padding: '3px 10px', borderRadius: 6,
                        cursor: 'pointer', border: 'none',
                        background: '#ede9fe', color: '#5b21b6', fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#5b21b6'; }}
                    >
                      <i className="bi bi-check2 me-1"></i>Read
                    </button>
                  )}
                  {(isUnread || n.status === 'Read') && !isDismissed && (
                    <button
                      onClick={() => onDismiss(n.notificationID)}
                      style={{
                        fontSize: '0.73rem', padding: '3px 10px', borderRadius: 6,
                        cursor: 'pointer', border: 'none',
                        background: '#fef3c7', color: '#92400e', fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#92400e'; }}
                    >
                      Dismiss
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(n.notificationID)}
                    style={{
                      fontSize: '0.73rem', padding: '3px 10px', borderRadius: 6,
                      cursor: 'pointer', border: 'none',
                      background: '#fee2e2', color: '#991b1b', fontWeight: 600,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }}
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid #f3f0ff',
        background: '#faf9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-clock-history me-1"></i>Sorted by newest first
        </span>
      </div>
    </div>
  );
}
