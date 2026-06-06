// src/pages/shared/Fraud/components/FraudSummary.jsx

export default function FraudSummary({ cases }) {
  const CARDS = [
    { label: 'Open',               value: cases.filter((c) => c.status === 'Open').length,                 icon: 'bi-folder2-open',        color: '#ef4444', bg: '#fee2e2' },
    { label: 'Under Investigation', value: cases.filter((c) => c.status === 'UnderInvestigation').length,  icon: 'bi-search',              color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Escalated',          value: cases.filter((c) => c.status === 'Escalated').length,            icon: 'bi-arrow-up-circle-fill', color: '#7c3aed', bg: '#f3f0ff' },
    { label: 'Resolved',           value: cases.filter((c) => c.status === 'Resolved').length,             icon: 'bi-check-circle-fill',   color: '#10b981', bg: '#d1fae5' },
  ];

  return (
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
          </div>
        </div>
      ))}
    </div>
  );
}
