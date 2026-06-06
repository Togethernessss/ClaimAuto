import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Badge } from 'react-bootstrap';
import { notificationStyle, timeAgo } from '../../data/policyholderDashboardData';
import { markNotificationRead, dismissNotificationById } from '../../services/policyholder/dashboardService';

export default function NotificationsBanner({ notifications, onUpdate }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(null);

  const urgent = notifications.filter(
    (n) => n.status === 'Unread' && ['Critical', 'Warning'].includes(n.severity)
  );

  if (urgent.length === 0) return null;

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    setBusy(id);
    try {
      await dismissNotificationById(id);
      await onUpdate?.();
    } finally {
      setBusy(null);
    }
  };

  const handleClick = async (notif) => {
    await markNotificationRead(notif.notificationID);
        navigate('/policyholder/notifications');
  };

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-bold text-dark d-flex align-items-center">
          <i className="bi bi-bell-fill text-danger me-2 fs-5"></i>
          <span>{urgent.length} notification{urgent.length !== 1 ? 's' : ''} need{urgent.length === 1 ? 's' : ''} your attention</span>
        </div>
        <Button variant="link" size="sm" className="text-decoration-none p-0" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Show' : 'Hide'} <i className={`bi bi-chevron-${collapsed ? 'down' : 'up'}`}></i>
        </Button>
      </div>

      {!collapsed && urgent.map((n) => {
        const s = notificationStyle(n.severity);
        return (
          <Alert
            key={n.notificationID}
            variant={s.variant}
            className="d-flex align-items-center mb-2 shadow-sm"
            style={{ cursor: 'pointer', borderRadius: 10 }}
            onClick={() => handleClick(n)}
          >
            <span style={{ fontSize: '1.5rem' }} className="me-3">{s.emoji}</span>
            <div className="flex-grow-1">
              <div className="fw-bold">{n.message}</div>
              <div className="small mt-1 d-flex gap-2 align-items-center">
                <Badge bg="light" text="dark">{n.category}</Badge>
                <span className="text-muted">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={busy === n.notificationID}
              onClick={(e) => handleDismiss(n.notificationID, e)}
              title="Dismiss"
            >
              {busy === n.notificationID ? '...' : <i className="bi bi-x-lg"></i>}
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}