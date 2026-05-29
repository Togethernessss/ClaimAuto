// src/pages/shared/Claims/components/ClaimsSummary.jsx
import { Card } from 'react-bootstrap';
import { formatCurrency } from '../utils/claimHelpers';

const STAT_CARDS = [
  { key: 'docsVerification', label: 'Docs Verification', icon: 'bi-file-earmark-check', bg: '#e0f7fa', color: '#00838f' },
  { key: 'underReview',      label: 'Under Review',      icon: 'bi-eye',                bg: '#fff3e0', color: '#e65100' },
  { key: 'approved',         label: 'Approved',           icon: 'bi-check-circle',       bg: '#e3f2fd', color: '#1565c0' },
  { key: 'paid',             label: 'Paid',               icon: 'bi-check-circle-fill',  bg: '#d1f2eb', color: '#2e7d32' },
  { key: 'rejected',         label: 'Rejected',           icon: 'bi-x-circle-fill',      bg: '#ffebee', color: '#c62828' },
];

export default function ClaimsSummary({ claims }) {
  const totalAmount = claims.reduce((s, c) => s + (c.totalBilledAmount ?? 0), 0);

  const values = {
    // DocsVerificationPending = awaiting staff document review (new entry state)
    docsVerification: claims.filter((c) => c.status === 'DocsVerificationPending').length,
    // UnderReview = fraud score ≥ 70 OR routed to manual adjudication queue
    underReview:      claims.filter((c) => c.status === 'UnderReview').length,
    // Approved = adjudication Paid/Partial, payment created but not yet executed
    approved:         claims.filter((c) => c.status === 'Approved').length,
    // Paid = payment fully executed, claim settled
    paid:             claims.filter((c) => c.status === 'Paid').length,
    rejected:         claims.filter((c) => c.status === 'Rejected').length,
  };

  return (
    <div className="mb-4">
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div className="d-flex gap-3 mb-3" style={{ minWidth: 'fit-content' }}>

          {/* Total */}
          <div className="flex-grow-1" style={{ minWidth: 120, flex: '1 1 0' }}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 38, height: 38, backgroundColor: '#e3f2fd' }}
                >
                  <i className="bi-folder2" style={{ color: '#1565c0', fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1.1rem' }}>{claims.length}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Claims</div>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Status cards */}
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="flex-grow-1" style={{ minWidth: 120, flex: '1 1 0' }}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, backgroundColor: card.bg }}
                  >
                    <i className={card.icon} style={{ color: card.color, fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1.1rem' }}>{values[card.key]}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{card.label}</div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}

          {/* Total billed */}
          <div className="flex-grow-1" style={{ minWidth: 140, flex: '1 1 0' }}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 38, height: 38, backgroundColor: '#e8f5e9' }}
                >
                  <i className="bi-cash-coin" style={{ color: '#2e7d32', fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1rem' }}>{formatCurrency(totalAmount)}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Billed</div>
                </div>
              </Card.Body>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
