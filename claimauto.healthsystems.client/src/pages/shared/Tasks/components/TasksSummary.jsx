const STAT_CARDS = [
  {
    statusKey: 'Pending',
    label: 'Pending',
    icon: 'bi-hourglass-split',
    accentColor: '#3b82f6',
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
  },
  {
    statusKey: 'InProgress',
    label: 'In Progress',
    icon: 'bi-arrow-repeat',
    accentColor: '#f59e0b',
    iconBg: '#fef9c3',
    iconColor: '#b45309',
  },
  {
    statusKey: 'Completed',
    label: 'Completed',
    icon: 'bi-check-circle-fill',
    accentColor: '#10b981',
    iconBg: '#d1fae5',
    iconColor: '#065f46',
  },
  {
    statusKey: 'Overdue',
    label: 'Overdue',
    icon: 'bi-alarm-fill',
    accentColor: '#ef4444',
    iconBg: '#fee2e2',
    iconColor: '#991b1b',
  },
];

export default function TasksSummary({ tasks }) {
  const counts = STAT_CARDS.reduce((acc, card) => {
    acc[card.statusKey] = tasks.filter(t => t.status === card.statusKey).length;
    return acc;
  }, {});

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 16,
      marginBottom: 20,
    }}>
      {STAT_CARDS.map((card) => (
        <div
          key={card.statusKey}
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
              {counts[card.statusKey]}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
