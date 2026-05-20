import React from 'react';

export default function ActivityLog({ user }) {
  const items = [
    {
      icon: 'bi-clock-history',
      label: 'Last Login',
      value: user.lastLogin
        ? new Date(user.lastLogin).toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'Not available',
    },
    {
      icon: 'bi-wifi',
      label: 'IP Address',
      value: user.ipAddress || 'Not tracked',
    },
    {
      icon: 'bi-geo-alt-fill',
      label: 'Location',
      value: user.location || 'Not tracked',
    },
  ];

  return (
    <div className="profile-card card border-0 shadow-sm overflow-hidden h-100">
      <div className="profile-card-header d-flex align-items-center gap-2 px-4 py-3">
        <div className="sec-icon-wrap green">
          <i className="bi bi-activity"></i>
        </div>
        <span className="fw-semibold" style={{ color: '#1e1b4b', fontSize: 15 }}>Recent Activity</span>
      </div>
      <div className="px-4 py-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="d-flex align-items-center gap-3 py-3"
            style={{ borderBottom: i < items.length - 1 ? '1px solid #f0edff' : 'none', fontSize: 14 }}
          >
            <i className={`bi ${item.icon}`} style={{ color: '#667eea', width: 18, textAlign: 'center' }}></i>
            <span style={{ color: '#64748b', minWidth: 95 }}>{item.label}:</span>
            <span className="fw-semibold" style={{ color: '#111827' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}