import { formatCurrency, calculateCoverageUsed } from '../../data/policyholderDashboardData';

/**
 * Coverage utilization bar.
 * Props unchanged: { policy, claims }
 * Calculations unchanged.
 */
export default function CoverageUtilization({ policy, claims }) {
  if (!policy) return null;

  // Calculations — unchanged
  const used      = calculateCoverageUsed(claims);
  const total     = policy.coverageAmount || 1;
  const percent   = Math.min(100, Math.round((used / total) * 100));
  const remaining = Math.max(0, total - used);

  // Dynamic colours based on usage — logic unchanged
  let barColor   = '#10b981';
  let glowColor  = 'rgba(16,185,129,0.35)';
  let badgeBg    = '#ecfdf5';
  let badgeColor = '#065f46';
  if (percent > 80) {
    barColor = '#ef4444'; glowColor = 'rgba(239,68,68,0.35)';
    badgeBg = '#fef2f2'; badgeColor = '#991b1b';
  } else if (percent > 60) {
    barColor = '#f59e0b'; glowColor = 'rgba(245,158,11,0.35)';
    badgeBg = '#fffbeb'; badgeColor = '#92400e';
  }

  return (
    <div
      className="mb-3 p-4"
      style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: badgeBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className="bi bi-activity" style={{ color: barColor, fontSize: '1rem' }}></i>
            </div>
            <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.97rem' }}>
              Coverage Utilization
            </span>
          </div>
          <small className="text-muted" style={{ paddingLeft: 42 }}>
            Annual coverage consumed vs. available
          </small>
        </div>

        {/* Percentage badge */}
        <div
          className="fw-bold rounded-3 text-center"
          style={{
            background: badgeBg,
            color: badgeColor,
            fontSize: '1.5rem',
            lineHeight: 1,
            padding: '10px 14px',
            minWidth: 76,
          }}
        >
          {percent}%
          <div style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.7, marginTop: 3, letterSpacing: '1px' }}>USED</div>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
      <div className="mb-1 d-flex justify-content-between" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
        <span>0%</span>
        <span>{percent}% used</span>
        <span>100%</span>
      </div>
      <div
        style={{
          height: 14,
          background: '#f1f5f9',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${barColor}bb 0%, ${barColor} 100%)`,
            borderRadius: 8,
            boxShadow: `0 0 14px ${glowColor}`,
            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

      {/* ── Three stat tiles ─────────────────────────────────────── */}
      <div className="d-flex gap-3">
        {[
          {
            label: 'Used',
            value: formatCurrency(used),
            bg: '#f8fafc',
            color: '#64748b',
            icon: 'bi-dash-circle',
            iconColor: '#94a3b8',
          },
          {
            label: 'Remaining',
            value: formatCurrency(remaining),
            bg: badgeBg,
            color: badgeColor,
            icon: 'bi-plus-circle-fill',
            iconColor: barColor,
          },
          {
            label: 'Total Cover',
            value: formatCurrency(total),
            bg: '#f0f4ff',
            color: '#4338ca',
            icon: 'bi-shield-fill',
            iconColor: '#6366f1',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex-fill text-center rounded-3 py-3"
            style={{ background: item.bg }}
          >
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: 4 }}>
              <i className={`bi ${item.icon} me-1`} style={{ color: item.iconColor }}></i>
              {item.label}
            </div>
            <div className="fw-bold" style={{ color: item.color, fontSize: '0.88rem' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
