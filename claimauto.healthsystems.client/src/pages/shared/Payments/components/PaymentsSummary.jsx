const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Payments',
    icon: 'bi-credit-card',
    accentColor: '#764ba2',
    iconBg: '#f3e8ff',
    iconColor: '#764ba2',
    filter: 'All',
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: 'bi-hourglass-split',
    accentColor: '#f59e0b',
    iconBg: '#fef9c3',
    iconColor: '#b45309',
    filter: 'Pending',
  },
  {
    key: 'authorized',
    label: 'Authorized',
    icon: 'bi-check-circle',
    accentColor: '#10b981',
    iconBg: '#d1fae5',
    iconColor: '#065f46',
    filter: 'Authorized',
  },
  {
    key: 'executed',
    label: 'Executed',
    icon: 'bi-send-check',
    accentColor: '#0d9488',
    iconBg: '#ccfbf1',
    iconColor: '#115e59',
    filter: 'Executed',
  },
];

export default function PaymentsSummary({
  payments,
  activeStatus = 'All',
  onCardClick,
}) {
  const values = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'Pending').length,
    authorized: payments.filter((p) => p.status === 'Authorized').length,
    executed: payments.filter((p) => p.status === 'Executed').length,
  };

  const totalExecuted = payments
    .filter((p) => p.status === 'Executed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 16,
      marginBottom: 24,
    }}>
      {STAT_CARDS.map((card) => {
        const selected = activeStatus === card.filter;
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onCardClick?.(card.filter)}
            style={{
              background: '#fff',
              borderRadius: 8,
              boxShadow: selected
                ? `0 8px 22px ${card.accentColor}24`
                : '0 2px 10px rgba(0,0,0,0.07)',
              border: selected ? `1px solid ${card.accentColor}` : '1px solid transparent',
              borderLeft: `4px solid ${card.accentColor}`,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left',
              transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
              cursor: onCardClick ? 'pointer' : 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 8px 22px ${card.accentColor}24`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = selected
                ? `0 8px 22px ${card.accentColor}24`
                : '0 2px 10px rgba(0,0,0,0.07)';
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: card.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`bi ${card.icon}`} style={{ fontSize: 20, color: card.iconColor }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1, color: '#1e293b' }}>
                {values[card.key]}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {card.label}
              </div>
              {card.key === 'executed' && totalExecuted > 0 && (
                <div style={{ fontSize: 10, color: '#0d9488', marginTop: 2, fontWeight: 500 }}>
                  INR {totalExecuted.toLocaleString('en-IN')} disbursed
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
