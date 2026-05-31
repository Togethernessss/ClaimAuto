import {
  formatCurrency,
  calculateCoverageUsed,
  calculateCoverageBreakdown,
} from '../../data/policyholderDashboardData';

/**
 * Coverage utilization bar.
 * Props:
 *   policy          — combined or single active policy (carries the total coverage)
 *   claims          — full claim list (we filter internally by active-policy IDs)
 *   activePolicies  — list of currently-active policies; used to scope claim sums
 *                     so a removed/expired policy's claims don't inflate "Used"
 */
export default function CoverageUtilization({ policy, claims, activePolicies }) {
  if (!policy) return null;

  // Filter coverage usage to only claims against currently-active policies.
  // Without this, a deleted policy's old claims keep counting and "Used" can
  // exceed "Total Cover" — which is mathematically impossible.
  const activePolicyIds = activePolicies?.map((p) => p.policyID) ?? null;
  const breakdown   = calculateCoverageBreakdown(claims, activePolicyIds);
  const used        = breakdown.total;
  const total       = policy.coverageAmount || 1;
  const rawPercent  = (used / total) * 100;
  const percent     = Math.min(100, Math.round(rawPercent));
  const remaining   = Math.max(0, total - used);
  const overLimit   = used > total;
  const showBreakdown = breakdown.paid > 0 || breakdown.approved > 0;

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

      {/* ── Over-limit warning ────────────────────────────────────
          Shown when claims under active policies exceed the available
          coverage cap. Most often means a high-value claim was filed
          against the only active policy and the cap is breached. */}
      {overLimit && (
        <div
          className="d-flex align-items-start gap-2 px-3 py-2 mb-3 rounded"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
          }}
        >
          <i className="bi bi-exclamation-triangle-fill" style={{ marginTop: 2 }}></i>
          <small>
            <strong>Coverage limit exceeded.</strong>{' '}
            {formatCurrency(used - total)} over the active-policy cap. Contact your
            insurer for excess settlement or activate an additional policy.
          </small>
        </div>
      )}

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

      {/* ── Lifecycle breakdown: "Paid" vs "Approved (queued)" ────────
          Shows the policyholder WHY their Used number is what it is.
          Production-grade clarity: "Used" includes BOTH money already
          paid and money that's approved but waiting for payment to
          execute. Splitting them visible removes the confusion of
          "I haven't received that money yet — why is it 'Used'?". */}
      {showBreakdown && (
        <div
          className="d-flex flex-wrap justify-content-between mt-3 pt-3"
          style={{
            borderTop: '1px dashed #e2e8f0',
            gap: 12,
          }}
        >
          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.72rem' }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#10b981', flexShrink: 0,
              }}
            ></span>
            <span style={{ color: '#64748b' }}>Already paid</span>
            <strong style={{ color: '#065f46' }}>{formatCurrency(breakdown.paid)}</strong>
          </div>

          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.72rem' }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#f59e0b', flexShrink: 0,
              }}
            ></span>
            <span style={{ color: '#64748b' }}>Approved (queued)</span>
            <strong style={{ color: '#92400e' }}>{formatCurrency(breakdown.approved)}</strong>
            <i
              className="bi bi-info-circle"
              title="Approved claims are committed against your coverage. Payment will execute shortly."
              style={{ color: '#94a3b8', fontSize: '0.7rem', cursor: 'help' }}
            ></i>
          </div>
        </div>
      )}
    </div>
  );
}
