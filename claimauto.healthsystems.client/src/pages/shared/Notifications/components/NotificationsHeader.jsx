import { Alert } from 'react-bootstrap';

export default function NotificationsHeader({
  unreadCount,
  successMsg,
  errorMsg,
  onMarkAllRead,
  onDeleteAll,
}) {
  return (
    <div className="px-4 pt-3 mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-bell fs-2 text-primary me-3"></i>
          <div>
            <h3 className="fw-bold mb-0">Notifications</h3>
            <small className="text-muted">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up!'}
            </small>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              className="btn btn-sm fw-semibold"
              onClick={onMarkAllRead}
              style={{
                background: '#e8f0fe',
                border: '0.5px solid #4285f4',
                color: '#1a56db',
                borderRadius: 6,
              }}
            >
              <i className="bi bi-check2-all me-1"></i>
              Mark all as read
            </button>
          )}
          <button
            className="btn btn-sm fw-semibold"
            onClick={onDeleteAll}
            style={{
              background: '#fdecea',
              border: '0.5px solid #e53935',
              color: '#b71c1c',
              borderRadius: 6,
            }}
          >
            <i className="bi bi-trash me-1"></i>
            Delete all
          </button>
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMsg}
        </Alert>
      )}
    </div>
  );
}