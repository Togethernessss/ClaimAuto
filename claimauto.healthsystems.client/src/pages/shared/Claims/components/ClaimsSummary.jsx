// src/pages/shared/Claims/components/ClaimsSummary.jsx
import { formatCurrency } from '../utils/claimHelpers';

// Maps stat-card key → the status value it filters to
const CARD_STATUS_MAP = {
  total:            'All',
  docsVerification: 'DocsVerificationPending',
  underReview:      'UnderReview',
  approved:         'Approved',
  paid:             'Paid',
  rejected:         'Rejected',
};

const STAT_CARDS = [
  {
    key:    'total',
    label:  'Total Claims',
    icon:   'bi-folder2-open',
    accent: '#667eea',
    bg:     '#f5f3ff',
  },
  {
    key:    'docsVerification',
    label:  'Docs Pending',
    icon:   'bi-file-earmark-check-fill',
    accent: '#0ea5e9',
    bg:     '#f0f9ff',
  },
  {
    key:    'underReview',
    label:  'Under Review',
    icon:   'bi-eye-fill',
    accent: '#f59e0b',
    bg:     '#fffbeb',
  },
  {
    key:    'approved',
    label:  'Approved',
    icon:   'bi-check-circle-fill',
    accent: '#3b82f6',
    bg:     '#eff6ff',
  },
  {
    key:    'paid',
    label:  'Paid',
    icon:   'bi-patch-check-fill',
    accent: '#10b981',
    bg:     '#f0fdf4',
  },
  {
    key:    'rejected',
    label:  'Rejected',
    icon:   'bi-x-circle-fill',
    accent: '#ef4444',
    bg:     '#fef2f2',
  },
];

/**
 * @param {object} props
 * @param {Array}    props.claims       Full (unfiltered) claims list.
 * @param {string}   [props.activeStatus]  Current statusFilter value so the matching card is highlighted.
 * @param {Function} [props.onCardClick]   Called with the status string when a card is clicked.
 */
export default function ClaimsSummary({ claims, activeStatus, onCardClick }) {
  // ── Sum the ACTUAL approved (payment) amounts for Approved + Paid claims ──
  // Use approvedAmount (from the Payments table via backend enrichment) rather
  // than totalBilledAmount (what the hospital billed).
  // A claim billed at ₹60L but approved for only ₹1L must show ₹1L here.
  // Fallback to totalBilledAmount only if approvedAmount is missing (pre-adjudication).
  const approvedAmount = claims
    .filter((c) => c.status === 'Approved' || c.status === 'Paid')
    .reduce((s, c) => s + (c.approvedAmount ?? c.totalBilledAmount ?? 0), 0);

  const values = {
    total:            claims.length,
    docsVerification: claims.filter((c) => c.status === 'DocsVerificationPending').length,
    underReview:      claims.filter((c) => c.status === 'UnderReview').length,
    approved:         claims.filter((c) => c.status === 'Approved').length,
    paid:             claims.filter((c) => c.status === 'Paid').length,
    rejected:         claims.filter((c) => c.status === 'Rejected').length,
  };

  return (
    <div className="mb-4">
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 'fit-content' }}>

          {/* ── Per-status stat cards ──────────────────────────────── */}
          {STAT_CARDS.map((card) => {
            const statusVal = CARD_STATUS_MAP[card.key];
            const isActive  = activeStatus === statusVal;
            const clickable = !!onCardClick;

            return (
              <div
                key={card.key}
                onClick={() => onCardClick?.(statusVal)}
                title={clickable ? `Filter by ${card.label}` : undefined}
                style={{
                  flex:         '1 1 0',
                  minWidth:     110,
                  background:   'white',
                  borderRadius: 14,
                  borderLeft:   `4px solid ${card.accent}`,
                  padding:      '14px 16px',
                  boxShadow:    isActive
                    ? `0 0 0 3px ${card.accent}40, 0 4px 18px rgba(0,0,0,0.1)`
                    : '0 2px 12px rgba(0,0,0,0.06)',
                  transition:   'box-shadow 0.18s, transform 0.18s',
                  cursor:       clickable ? 'pointer' : 'default',
                  position:     'relative',
                  overflow:     'hidden',
                  outline:      isActive ? `2px solid ${card.accent}` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!clickable) return;
                  e.currentTarget.style.boxShadow = `0 6px 22px rgba(0,0,0,0.11)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!clickable) return;
                  e.currentTarget.style.boxShadow = isActive
                    ? `0 0 0 3px ${card.accent}40, 0 4px 18px rgba(0,0,0,0.1)`
                    : '0 2px 12px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Faint tinted background blob */}
                <div style={{
                  position:     'absolute',
                  top: -12, right: -12,
                  width:        56, height: 56,
                  borderRadius: '50%',
                  background:   card.bg,
                  pointerEvents: 'none',
                }} />

                {/* Active ring indicator */}
                {isActive && (
                  <div style={{
                    position:   'absolute',
                    top: 8, right: 10,
                    fontSize:   9,
                    fontWeight: 700,
                    color:      card.accent,
                    background: card.bg,
                    borderRadius: 20,
                    padding:    '1px 7px',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}>
                    Active
                  </div>
                )}

                {/* Icon badge */}
                <div style={{
                  width:          32, height: 32,
                  borderRadius:   9,
                  background:     card.bg,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   10,
                }}>
                  <i className={`bi ${card.icon}`}
                    style={{ color: card.accent, fontSize: '0.88rem' }}></i>
                </div>

                {/* Count */}
                <div style={{
                  fontSize:      '1.6rem',
                  fontWeight:    800,
                  lineHeight:    1,
                  color:         card.accent,
                  letterSpacing: '-0.5px',
                  marginBottom:  4,
                }}>
                  {values[card.key]}
                </div>

                {/* Label */}
                <div style={{
                  fontSize:      '0.7rem',
                  fontWeight:    600,
                  color:         '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {card.label}
                </div>

                {/* Clickable hint */}
                {clickable && (
                  <div style={{
                    fontSize:   '0.65rem',
                    color:      '#94a3b8',
                    marginTop:  3,
                  }}>
                    Click to filter
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Approved Amount card (was "Total Billed" — now only Approved+Paid) ── */}
          <div
            style={{
              flex:         '1 1 0',
              minWidth:     175,      /* wide enough for large currency values */
              background:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 14,
              padding:      '14px 16px',
              boxShadow:    '0 4px 18px rgba(102,126,234,0.35)',
              transition:   'box-shadow 0.18s, transform 0.18s',
              cursor:       'default',
              position:     'relative',
              overflow:     'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(102,126,234,0.45)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(102,126,234,0.35)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Orbs */}
            <div style={{
              position: 'absolute', pointerEvents: 'none',
              width: 70, height: 70, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              top: -20, right: -10,
            }} />

            {/* Icon */}
            <div style={{
              width:          32, height: 32,
              borderRadius:   9,
              background:     'rgba(255,255,255,0.18)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              marginBottom:   10,
            }}>
              <i className="bi bi-cash-coin"
                style={{ color: 'white', fontSize: '0.88rem' }}></i>
            </div>

            {/* Amount — no nowrap so large values don't bleed outside the card */}
            <div style={{
              fontSize:     '1rem',
              fontWeight:   800,
              lineHeight:   1.15,
              color:        'white',
              letterSpacing:'-0.3px',
              marginBottom: 4,
              wordBreak:    'break-word',   /* wraps gracefully if still too wide */
              overflowWrap: 'anywhere',
            }}>
              {formatCurrency(approvedAmount)}
            </div>

            {/* Label */}
            <div style={{
              fontSize:      '0.7rem',
              fontWeight:    600,
              color:         'rgba(255,255,255,0.72)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace:    'nowrap',      /* label itself stays on one line */
            }}>
              Approved Amount
            </div>

            {/* Sub-note */}
            <div style={{
              fontSize:   '0.64rem',
              color:      'rgba(255,255,255,0.5)',
              marginTop:  3,
              whiteSpace: 'nowrap',
            }}>
              Approved &amp; Paid only
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
