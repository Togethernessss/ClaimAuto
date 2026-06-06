import { Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ActionBadge from './ActionBadge';

// Category → icon mapping for the resource column
const RESOURCE_ICON = {
  User:          'bi-person-fill',
  Claim:         'bi-file-medical-fill',
  ClaimLine:     'bi-list-check',
  ClaimDocument: 'bi-paperclip',
  Policy:        'bi-shield-fill',
  Member:        'bi-person-badge-fill',
  Rule:          'bi-gear-fill',
  Adjudication:  'bi-check2-square',
  Payment:       'bi-credit-card-fill',
  Appeal:        'bi-megaphone-fill',
  Notification:  'bi-bell-fill',
  Task:          'bi-list-task',
  FraudCase:     'bi-exclamation-triangle-fill',
};

const RESOURCE_COLOR = {
  User:          '#6366f1',
  Claim:         '#3b82f6',
  ClaimLine:     '#8b5cf6',
  ClaimDocument: '#0ea5e9',
  Policy:        '#10b981',
  Member:        '#f59e0b',
  Rule:          '#64748b',
  Adjudication:  '#a21caf',
  Payment:       '#059669',
  Appeal:        '#ef4444',
  Notification:  '#f97316',
  Task:          '#14b8a6',
  FraudCase:     '#dc2626',
};

// Props:
//   logs       — array of AuditLogDto instances (already paginated)
//   loading    — boolean
//   error      — string or null
//   onViewLog  — (log) => void
export default function AuditLogTable({ logs, loading, error, onViewLog }) {

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-5">
        <div
          style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(102,126,234,0.4)',
          }}
        >
          <Spinner animation="border" variant="light" style={{ width: 24, height: 24, borderWidth: 3 }} />
        </div>
        <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}>
          Loading audit logs…
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="d-flex align-items-center gap-3 p-4 rounded-3 m-3"
        style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }}></i>
        </div>
        <div style={{ color: '#991b1b', fontSize: '0.875rem', fontWeight: 500 }}>{error}</div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-5">
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>
          <i className="bi bi-journal-x"></i>
        </div>
        <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 4 }}>No audit logs found</div>
        <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Try adjusting your filters</div>
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>

        {/* ── Head ──────────────────────────────────────────────── */}
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderBottom: '2px solid #ddd6fe' }}>
            {[
              { label: 'Log ID',    width: 80 },
              { label: 'Timestamp', width: 180 },
              { label: 'User',      width: 200 },
              { label: 'Action',    width: 160 },
              { label: 'Resource',  width: undefined },
              { label: 'Details',   width: 90 },
            ].map((col) => (
              <th
                key={col.label}
                style={{
                  padding:       '12px 16px',
                  fontSize:      '0.68rem',
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  color:         '#5b21b6',
                  width:         col.width,
                  whiteSpace:    'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ──────────────────────────────────────────────── */}
        <tbody>
          {logs.map((log, idx) => {
            const resourceType  = log.resourceType || '';
            const resIcon       = RESOURCE_ICON[resourceType]  || 'bi-box';
            const resColor      = RESOURCE_COLOR[resourceType] || '#64748b';
            const isEven        = idx % 2 === 0;

            return (
              <tr
                key={log.auditID}
                style={{
                  background:  isEven ? 'white' : '#fafbff',
                  borderBottom: '1px solid #f1f5f9',
                  transition:  'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isEven ? 'white' : '#fafbff'; }}
              >

                {/* Log ID */}
                <td style={{ padding: '12px 16px' }}>
                  <span
                    className="font-monospace"
                    style={{
                      fontSize:     '0.75rem',
                      fontWeight:   700,
                      color:        '#7c3aed',
                      background:   '#ede9fe',
                      padding:      '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    #{log.auditID}
                  </span>
                </td>

                {/* Timestamp */}
                <td style={{ padding: '12px 16px' }}>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>{log.absoluteTime}</Tooltip>}
                  >
                    <div style={{ cursor: 'default' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                        <i className="bi bi-clock me-1" style={{ color: '#7c3aed', fontSize: '0.7rem' }}></i>
                        {log.relativeTime}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                        {log.absoluteTime?.split('T')[0] ?? ''}
                      </div>
                    </div>
                  </OverlayTrigger>
                </td>

                {/* User */}
                <td style={{ padding: '12px 16px' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: 'white',
                      }}
                    >
                      {log.userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                        {log.userName || '—'}
                      </div>
                      {log.userID && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          ID #{log.userID}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Action */}
                <td style={{ padding: '12px 16px' }}>
                  <ActionBadge log={log} />
                </td>

                {/* Resource */}
                <td style={{ padding: '12px 16px' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: `${resColor}1a`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <i className={`bi ${resIcon}`} style={{ color: resColor, fontSize: '0.72rem' }}></i>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                      {log.resourceLabel || '—'}
                    </span>
                  </div>
                </td>

                {/* View button */}
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => onViewLog && onViewLog(log)}
                    title="View full details"
                    style={{
                      padding:      '4px 12px',
                      borderRadius: 8,
                      border:       'none',
                      background:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color:        'white',
                      fontSize:     '0.75rem',
                      fontWeight:   600,
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          4,
                      whiteSpace:   'nowrap',
                      boxShadow:    '0 2px 6px rgba(102,126,234,0.3)',
                      transition:   'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <i className="bi bi-eye-fill" style={{ fontSize: '0.7rem' }}></i> View
                  </button>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
