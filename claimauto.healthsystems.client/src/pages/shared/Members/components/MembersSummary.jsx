export default function MembersSummary({
  members,
  activeStatus = 'All',
  onCardClick,
}) {
  const uniquePolicies = new Set(
    members.map((m) => m.policyID).filter(Boolean)
  ).size;

  const cards = [
    {
      key: 'total',
      label: 'Total Members',
      value: members.length,
      icon: 'bi-people-fill',
      color: '#7c3aed',
      bg: '#f3f0ff',
      filter: 'All',
    },
    {
      key: 'active',
      label: 'Active',
      value: members.filter((m) => m.status === 'Active').length,
      icon: 'bi-person-check-fill',
      color: '#10b981',
      bg: '#d1fae5',
      filter: 'Active',
    },
    {
      key: 'inactive',
      label: 'Inactive',
      value: members.filter((m) => m.status === 'Inactive').length,
      icon: 'bi-person-dash-fill',
      color: '#6b7280',
      bg: '#f3f4f6',
      filter: 'Inactive',
    },
    {
      key: 'suspended',
      label: 'Suspended',
      value: members.filter((m) => m.status === 'Suspended').length,
      icon: 'bi-person-x-fill',
      color: '#f59e0b',
      bg: '#fef3c7',
      filter: 'Suspended',
    },
    {
      key: 'policies',
      label: 'Policies Used',
      value: uniquePolicies,
      icon: 'bi-shield-check',
      color: '#3b82f6',
      bg: '#dbeafe',
      filter: 'All',
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {cards.map((card) => {
        const selected = card.key !== 'policies' && activeStatus === card.filter;
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onCardClick?.(card.filter)}
            style={{
              flex: '1 1 140px',
              minWidth: 150,
              background: 'white',
              borderRadius: 8,
              boxShadow: selected
                ? `0 8px 22px ${card.color}22`
                : '0 2px 8px rgba(0,0,0,0.06)',
              border: selected ? `1px solid ${card.color}` : '1px solid transparent',
              borderLeft: `4px solid ${card.color}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              cursor: onCardClick ? 'pointer' : 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 22px ${card.color}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = selected
                ? `0 8px 22px ${card.color}22`
                : '0 2px 8px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: card.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`bi ${card.icon}`} style={{ color: card.color, fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, color: '#1f2937' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, fontWeight: 500 }}>
                {card.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
