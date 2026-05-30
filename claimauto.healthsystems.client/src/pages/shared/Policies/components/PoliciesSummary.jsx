const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Policies',
    icon: 'bi-shield-check',
    bg: '#ede9fe',
    color: '#7c3aed',
    border: '#7c3aed',
    filter: 'All',
  },
  {
    key: 'active',
    label: 'Active',
    icon: 'bi-check-circle-fill',
    bg: '#d1fae5',
    color: '#065f46',
    border: '#10b981',
    filter: 'Active',
  },
  {
    key: 'expired',
    label: 'Expired',
    icon: 'bi-calendar-x-fill',
    bg: '#f3f4f6',
    color: '#4b5563',
    border: '#9ca3af',
    filter: 'Expired',
  },
  {
    key: 'suspended',
    label: 'Suspended',
    icon: 'bi-pause-circle-fill',
    bg: '#fef3c7',
    color: '#92400e',
    border: '#f59e0b',
    filter: 'Suspended',
  },
  {
    key: 'enrolled',
    label: 'Total Enrolled',
    icon: 'bi-people-fill',
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#f97316',
    filter: 'All',
  },
];

export default function PoliciesSummary({
  policies,
  activeStatus = 'All',
  onCardClick,
}) {
  const values = {
    total: policies.length,
    active: policies.filter((p) => p.status === 'Active').length,
    expired: policies.filter((p) => p.status === 'Expired').length,
    suspended: policies.filter((p) => p.status === 'Suspended').length,
    enrolled: policies.reduce((sum, p) => sum + (p.memberCount ?? 0), 0),
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div className="d-flex gap-3 mb-4" style={{ minWidth: 'fit-content' }}>
        {STAT_CARDS.map((card) => {
          const selected = card.key !== 'enrolled' && activeStatus === card.filter;
          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onCardClick?.(card.filter)}
              style={{
                minWidth: 148,
                flex: '1 1 0',
                background: 'white',
                borderRadius: 8,
                padding: '14px 16px',
                border: selected ? `1px solid ${card.border}` : '1px solid transparent',
                borderLeft: `4px solid ${card.border}`,
                boxShadow: selected
                  ? `0 8px 22px ${card.border}22`
                  : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
                cursor: onCardClick ? 'pointer' : 'default',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 22px ${card.border}22`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = selected
                  ? `0 8px 22px ${card.border}22`
                  : '0 2px 8px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  background: card.bg,
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <i className={`bi ${card.icon}`} style={{ color: card.color, fontSize: 14 }}></i>
                </div>
              </div>

              <div style={{ fontSize: '1.55rem', fontWeight: 700, lineHeight: 1.1, color: '#1f2937' }}>
                {values[card.key]}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 3 }}>
                {card.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
