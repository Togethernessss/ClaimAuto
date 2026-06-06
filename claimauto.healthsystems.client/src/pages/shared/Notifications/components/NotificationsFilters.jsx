// src/pages/shared/Notifications/components/NotificationsFilters.jsx
export default function NotificationsFilters({
  statusFilter,
  categoryFilter,
  filteredCount,
  loading,
  onStatusChange,
  onCategoryChange,
}) {
  const STATUS_OPTS = [
    { value: 'All',       label: 'All Statuses',  dot: null },
    { value: 'Unread',    label: 'Unread',         dot: '#667eea' },
    { value: 'Read',      label: 'Read',           dot: '#10b981' },
    { value: 'Dismissed', label: 'Dismissed',      dot: '#9ca3af' },
  ];

  const CATEGORY_OPTS = [
    { value: 'All',       label: 'All Categories' },
    { value: 'Claim',     label: 'Claim' },
    { value: 'Payment',   label: 'Payment' },
    { value: 'Appeal',    label: 'Appeal' },
    { value: 'Document',  label: 'Document' },
    { value: 'Fraud',     label: 'Fraud' },
    { value: 'Policy',    label: 'Policy' },
    { value: 'Account',   label: 'Account' },
    { value: 'Member',    label: 'Member' },
    { value: 'Exception', label: 'Exception' },
  ];

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '12px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{
          padding: '7px 12px', border: '1px solid #e5e7eb',
          borderRadius: 8, fontSize: '0.83rem', background: '#f9fafb',
          color: '#374151', outline: 'none', minWidth: 140,
        }}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Category filter */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        style={{
          padding: '7px 12px', border: '1px solid #e5e7eb',
          borderRadius: 8, fontSize: '0.83rem', background: '#f9fafb',
          color: '#374151', outline: 'none', minWidth: 150,
        }}
      >
        {CATEGORY_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Count */}
      {!loading && (
        <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 4 }}>
          <i className="bi bi-bell me-1" style={{ fontSize: '0.7rem' }}></i>
          {filteredCount} {filteredCount === 1 ? 'notification' : 'notifications'}
        </span>
      )}

      {/* Active filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {statusFilter !== 'All' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#f3f0ff', color: '#7c3aed',
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.73rem', fontWeight: 600,
          }}>
            {statusFilter}
            <button onClick={() => onStatusChange('All')} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 11 }}>✕</button>
          </span>
        )}
        {categoryFilter !== 'All' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#f0fdf4', color: '#15803d',
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.73rem', fontWeight: 600,
          }}>
            {categoryFilter}
            <button onClick={() => onCategoryChange('All')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 11 }}>✕</button>
          </span>
        )}
      </div>
    </div>
  );
}
