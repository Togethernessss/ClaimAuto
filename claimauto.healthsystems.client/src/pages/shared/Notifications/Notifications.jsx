import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  deleteNotification,
  deleteAllNotifications,
} from '../../../services/notifications/notificationService';
import { useNotifications } from '../../../security/NotificationContext';
import NotificationsHeader  from './components/NotificationsHeader';
import NotificationsFilters from './components/NotificationsFilters';
import NotificationsList    from './components/NotificationsList';

export default function Notifications() {
  const { refresh } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [successMsg,    setSuccessMsg]    = useState(null);
  const [errorMsg,      setErrorMsg]      = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [statusFilter,   setStatusFilter]   = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyNotifications(
        statusFilter   !== 'All' ? statusFilter   : null,
        categoryFilter !== 'All' ? categoryFilter : null,
      );
      setNotifications(data);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  async function handleMarkRead(id) {
    setActionLoading(id);
    try {
      await markAsRead(id);
      setSuccessMsg('Notification marked as read.');
      loadNotifications();
      refresh();
    } catch {
      setErrorMsg('Failed to mark as read.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setSuccessMsg('All notifications marked as read.');
      loadNotifications();
      refresh();
    } catch {
      setErrorMsg('Failed to mark all as read.');
    }
  }

  async function handleDismiss(id) {
    setActionLoading(id);
    try {
      await dismissNotification(id);
      setSuccessMsg('Notification dismissed.');
      loadNotifications();
      refresh();
    } catch {
      setErrorMsg('Failed to dismiss notification.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id) {
    setActionLoading(id);
    try {
      await deleteNotification(id);
      setSuccessMsg('Notification deleted.');
      loadNotifications();
      refresh();
    } catch {
      setErrorMsg('Failed to delete notification.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAllNotifications();
      setSuccessMsg('All notifications deleted.');
      loadNotifications();
      refresh();
    } catch {
      setErrorMsg('Failed to delete all notifications.');
    }
  }

  return (
    <Container fluid className="p-0">

      <NotificationsHeader
        unreadCount={unreadCount}
        successMsg={successMsg}
        errorMsg={errorMsg}
        onMarkAllRead={handleMarkAllRead}
        onDeleteAll={handleDeleteAll}
      />

      <div className="px-4 pb-4">
        <NotificationsFilters
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          filteredCount={notifications.length}
          loading={loading}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
        />

        <NotificationsList
          notifications={notifications}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          onRetry={loadNotifications}
          onMarkRead={handleMarkRead}
          onDismiss={handleDismiss}
          onDelete={handleDelete}
        />
      </div>

    </Container>
  );
}