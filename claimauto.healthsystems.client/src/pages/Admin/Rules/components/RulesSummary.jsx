// src/pages/Admin/Rules/components/RulesSummary.jsx

const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Rules',
    icon: 'bi-gear',
    accentColor: '#764ba2',
    iconBg: '#f3e8ff',
    iconColor: '#6d28d9',
  },
  {
    key: 'active',
    label: 'Active',
    icon: 'bi-check-circle-fill',
    accentColor: '#10b981',
    iconBg: '#d1fae5',
    iconColor: '#065f46',
  },
  {
    key: 'draft',
    label: 'Draft',
    icon: 'bi-pencil-fill',
    accentColor: '#f59e0b',
    iconBg: '#fef9c3',
    iconColor: '#b45309',
  },
  {
    key: 'inactive',
    label: 'Inactive',
    icon: 'bi-pause-circle-fill',
    accentColor: '#9ca3af',
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
  },
];

export default function RulesSummary({ rules }) {
  const values = {
    total:    rules.length,
    active:   rules.filter((r) => r.status === 'Active').length,
    draft:    rules.filter((r) => r.status === 'Draft').length,
    inactive: rules.filter((r) => r.status === 'Inactive').length,
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 16,
      marginBottom: 24,
    }}>
      {STAT_CARDS.map((card) => (
        <div
          key={card.key}
          style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            borderLeft: `4px solid ${card.accentColor}`,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transition: 'transform 0.18s, box-shadow 0.18s',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)';
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: card.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`bi ${card.icon}`} style={{ fontSize: 20, color: card.iconColor }}></i>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1, color: '#1e293b' }}>
              {values[card.key]}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
