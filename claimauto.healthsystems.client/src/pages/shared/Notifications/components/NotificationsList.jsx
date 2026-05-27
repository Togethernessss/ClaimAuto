import { Card, Alert, Button, Spinner } from 'react-bootstrap';

// ── UTC fix: add Z if missing so browser treats as UTC ────────
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

function categoryStyle(cat) {
  switch (cat) {
    case 'Payment':   return { bg: '#d1f2eb', color: '#085041' };
    case 'Appeal':    return { bg: '#e3f2fd', color: '#0C447C' };
    case 'Exception': return { bg: '#fdecea', color: '#b71c1c' };
    default:          return { bg: '#e2e3e5', color: '#41464b' };
  }
}

function severityStyle(sev) {
  switch (sev) {
    case 'Info':     return { bg: '#e3f2fd', color: '#0C447C' };
    case 'Warning':  return { bg: '#fff3e0', color: '#e65100' };
    case 'Critical': return { bg: '#fdecea', color: '#b71c1c' };
    default:         return { bg: '#e2e3e5', color: '#41464b' };
  }
}

function statusStyle(status) {
  switch (status) {
    case 'Unread':
      return { bg: '#f3f0ff', dot: '#667eea', solid: true };
    case 'Read':
      return { bg: 'white', dot: 'transparent', solid: false };
    case 'Dismissed':
      return { bg: 'white', dot: 'transparent', solid: false };
    default:
      return { bg: 'white', dot: 'transparent', solid: false };
  }
}

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
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">
              Loading notifications...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-4">
            <Alert
              variant="danger"
              className="d-flex align-items-center mb-0"
            >
              <i className="bi bi-exclamation-triangle-fill me-2">
              </i>
              {error}
              <Button
                variant="link" size="sm"
                className="ms-auto p-0 text-danger"
                onClick={onRetry}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Retry
              </Button>
            </Alert>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-bell-slash"
              style={{ fontSize: 48, color: '#dfe4ea' }}></i>
            <div className="fw-semibold text-muted mt-3">
              No notifications found
            </div>
            <div className="small text-muted mt-1">
              You're all caught up!
            </div>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div>
            {notifications.map((n, index) => {
              const ss  = statusStyle(n.status);
              const cs  = categoryStyle(n.category);
              const svs = severityStyle(n.severity);
              const isLoading    = actionLoading === n.notificationID;
              const isDismissed  = n.status === 'Dismissed';

              return (
                <div
                  key={n.notificationID}
                  style={{
                    padding: '14px 16px',
                    borderBottom:
                      index < notifications.length - 1
                        ? '0.5px solid #f0f0f0' : 'none',
                    background: ss.bg,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    opacity: isDismissed ? 0.7 : 1,
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: ss.solid
                      ? ss.dot : 'transparent',
                    border: ss.solid
                      ? 'none' : '1.5px solid #9e9e9e',
                    flexShrink: 0, marginTop: 5,
                  }}></div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight:
                        n.status === 'Unread' ? 500 : 400,
                      color: isDismissed
                        ? '#9e9e9e' : '#1e2a3a',
                      textDecoration: isDismissed
                        ? 'line-through' : 'none',
                      lineHeight: 1.5,
                    }}>
                      {n.message}
                    </div>
                    {n.claimID && (
                      <div style={{
                        fontSize: 11,
                        color: '#6c757d',
                        marginTop: 2,
                      }}>
                        Claim #{n.claimID}
                      </div>
                    )}
                    <div style={{
                      display: 'flex', gap: 6,
                      marginTop: 6, flexWrap: 'wrap',
                      alignItems: 'center',
                    }}>
                      <span style={{
                        fontSize: 11, padding: '1px 7px',
                        borderRadius: 20, fontWeight: 500,
                        background: cs.bg, color: cs.color,
                      }}>
                        {n.category}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '1px 7px',
                        borderRadius: 20, fontWeight: 500,
                        background: svs.bg, color: svs.color,
                      }}>
                        {n.severity}
                      </span>
                      <span style={{
                        fontSize: 11, color: '#6c757d',
                      }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex', gap: 6,
                    flexShrink: 0,
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}>
                    {isLoading ? (
                      <Spinner
                        animation="border"
                        size="sm"
                        variant="primary"
                      />
                    ) : (
                      <>
                        {n.status === 'Unread' && (
                          <button
                            onClick={() =>
                              onMarkRead(n.notificationID)}
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              background: '#e8f0fe',
                              border: '0.5px solid #4285f4',
                              color: '#1a56db',
                            }}
                          >
                            Mark read
                          </button>
                        )}
                        {(n.status === 'Unread' ||
                          n.status === 'Read') && (
                          <button
                            onClick={() =>
                              onDismiss(n.notificationID)}
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              background: '#fff3e0',
                              border: '0.5px solid #e65100',
                              color: '#e65100',
                            }}
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onDelete(n.notificationID)}
                          style={{
                            fontSize: 11,
                            padding: '3px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: '#fdecea',
                            border: '0.5px solid #e53935',
                            color: '#b71c1c',
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </Card.Body>
    </Card>
  );
}