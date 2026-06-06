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

const PAGE_SIZE = 15;

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) result.push('...');
  }
  return result;
}

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
  const [currentPage, setCurrentPage] = useState(1);

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

  // ── Auto-mark all unread as read on first visit ─────────────────────
  // The bell badge clears as soon as the user lands on this page, matching
  // the standard "you've seen it" behavior. We fire ONCE per page mount
  // (empty deps) so filter changes don't re-trigger it. The cancelled flag
  // protects against React 18 strict-mode double-invoke in dev.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await markAllAsRead();
        if (!cancelled) {
          refresh();             // tell the bell context to refetch → badge drops to 0
          loadNotifications();   // re-render the list so rows now appear as Read
        }
      } catch {
        // Silent — user can still hit "Mark all as read" manually if this fails
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => { setCurrentPage(1); }, [statusFilter, categoryFilter]);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const safeePage  = Math.min(currentPage, totalPages);
  const startIdx   = (safeePage - 1) * PAGE_SIZE;
  const endIdx     = Math.min(startIdx + PAGE_SIZE, notifications.length);
  const pagedNotifications = notifications.slice(startIdx, endIdx);

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

      <div className="px-4 pt-4">
        <NotificationsHeader
          unreadCount={unreadCount}
          successMsg={successMsg}
          errorMsg={errorMsg}
          onMarkAllRead={handleMarkAllRead}
          onDeleteAll={handleDeleteAll}
        />
      </div>

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
          notifications={pagedNotifications}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          onRetry={loadNotifications}
          onMarkRead={handleMarkRead}
          onDismiss={handleDismiss}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
              {' '}·{' '}<strong>{notifications.length}</strong> total notification{notifications.length !== 1 ? 's' : ''}
            </div>
            <div className="d-flex align-items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeePage === 1}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === 1 ? '#f8fafc' : 'white', color: safeePage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === 1 ? 'not-allowed' : 'pointer' }}>
                <i className="bi bi-chevron-left me-1"></i>Prev
              </button>
              {getPageNumbers(safeePage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ width: 36, height: 34, borderRadius: 8, border: safeePage === p ? 'none' : '1px solid #e2e8f0', background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: safeePage === p ? 'white' : '#475569', fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500, cursor: 'pointer', boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none' }}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeePage === totalPages}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === totalPages ? '#f8fafc' : 'white', color: safeePage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === totalPages ? 'not-allowed' : 'pointer' }}>
                Next<i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

    </Container>
  );
}
