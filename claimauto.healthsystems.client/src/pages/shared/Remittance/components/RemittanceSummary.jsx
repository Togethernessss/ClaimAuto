import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function RemittanceSummary({ remittances }) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  const total       = remittances.length;
  const generated   = remittances.filter((r) => r.status === 'Generated').length;
  const sent        = remittances.filter((r) => r.status === 'Sent').length;
  const acked       = remittances.filter((r) => r.status === 'Acknowledged').length;
  const totalAmount = remittances
    .filter((r) => r.status === 'Acknowledged' || r.status === 'Sent')
    .reduce((s, r) => s + r.amount, 0);

  const CARDS = [
    { label: isHospital ? 'Total Received' : 'Total', value: total,     icon: 'bi-receipt-cutoff',    color: '#7c3aed', bg: '#f3f0ff', show: true,       extra: null },
    { label: 'Generated',                             value: generated,  icon: 'bi-hourglass-split',   color: '#3b82f6', bg: '#dbeafe', show: !isHospital, extra: null },
    { label: isHospital ? 'Pending Ack.' : 'Sent',   value: sent,       icon: 'bi-send-fill',         color: '#f59e0b', bg: '#fef3c7', show: true,       extra: null },
    { label: 'Acknowledged',                          value: acked,      icon: 'bi-check-circle-fill', color: '#10b981', bg: '#d1fae5', show: true,       extra: totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')} total` : null },
  ].filter((c) => c.show);

  return (
    <>
      {/* Hospital alert banner for pending acknowledgements */}
      {isHospital && sent > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <i className="bi bi-bell-fill" style={{ color: '#f59e0b', marginTop: 2 }}></i>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>
              {sent} remittance{sent > 1 ? 's' : ''} awaiting your acknowledgement
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>
              Please confirm receipt to close the payment loop with the insurer.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {CARDS.map((c) => (
          <div
            key={c.label}
            style={{ flex: '1 1 140px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${c.icon}`} style={{ color: c.color, fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: '#1f2937' }}>{c.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{c.label}</div>
              {c.extra && <div style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 1, fontWeight: 600 }}>{c.extra}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
