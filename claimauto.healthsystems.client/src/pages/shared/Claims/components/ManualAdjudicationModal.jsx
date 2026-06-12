// ManualAdjudicationModal.jsx
// Shown when a claim is in UnderReview status.
// Staff/Admin records a final decision: Approve (full), Partial, or Deny.
// Calls POST /api/adjudication/manual via the parent's onSubmit handler.

import { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../utils/claimHelpers';

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: 9,
  fontSize: '0.84rem', color: '#1e1b4b',
  background: '#f9fafb', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, background 0.15s',
};

// ── Decision options ──────────────────────────────────────────────────────────
const DECISIONS = [
  {
    value:       'Paid',
    label:       'Approve — Full Payment',
    description: 'Claim is approved. Full billed amount (or custom amount) becomes payable.',
    icon:        'bi-check-circle-fill',
    color:       '#16a34a',
    bg:          '#f0fdf4',
    border:      '#86efac',
  },
  {
    value:       'Partial',
    label:       'Approve — Partial Payment',
    description: 'Claim is partially approved. Enter the payable amount below.',
    icon:        'bi-check-circle',
    color:       '#0284c7',
    bg:          '#f0f9ff',
    border:      '#7dd3fc',
  },
  {
    value:       'Denied',
    label:       'Deny Claim',
    description: 'Claim is denied. Claim status changes to Rejected. Provider will be notified.',
    icon:        'bi-x-circle-fill',
    color:       '#dc2626',
    bg:          '#fff5f5',
    border:      '#fca5a5',
  },
];

export default function ManualAdjudicationModal({
  show,
  claim,
  loading,
  error,
  onHide,
  onSubmit,    // (dto) => void  — dto: { claimID, decision, payableAmount?, notes }
}) {
  const [decision,      setDecision]      = useState('');
  const [payableAmount, setPayableAmount] = useState('');
  const [notes,         setNotes]         = useState('');
  const [formError,     setFormError]     = useState(null);

  // Reset form every time the modal opens
  useEffect(() => {
    if (show) {
      setDecision('');
      setPayableAmount('');
      setNotes('');
      setFormError(null);
    }
  }, [show]);

  if (!claim) return null;

  const selectedDecision = DECISIONS.find(d => d.value === decision);
  const needsAmount      = decision === 'Paid' || decision === 'Partial';
  const isDeny           = decision === 'Denied';

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!decision) {
      setFormError('Please select a decision.');
      return;
    }
    if (!notes.trim() || notes.trim().length < 10) {
      setFormError('Notes are required and must be at least 10 characters. Document your reasoning.');
      return;
    }
    if (needsAmount) {
      const amt = Number(payableAmount);
      if (!payableAmount || isNaN(amt) || amt <= 0) {
        setFormError('Enter a valid payable amount greater than ₹0.');
        return;
      }
      if (amt > claim.totalBilledAmount) {
        setFormError(`Payable amount (₹${amt.toLocaleString('en-IN')}) cannot exceed the billed amount (${formatCurrency(claim.totalBilledAmount)}).`);
        return;
      }
    }

    onSubmit({
      claimID:       claim.claimID,
      decision,
      payableAmount: needsAmount ? Number(payableAmount) : null,
      notes:         notes.trim(),
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="md" backdrop="static" centered>

      {/* ── Gradient header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-60, right:-30, pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background: 'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <i className="bi bi-clipboard2-check-fill" style={{ fontSize:'1.25rem', color:'white' }} />
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1rem' }}>Manual Review Decision</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.73rem' }}>
                CLM-{claim.claimID} · {claim.memberName}
              </div>
            </div>
          </div>
          <button onClick={onHide} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:15,
          }}>✕</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px 0' }}>

          {/* ── Claim summary banner ─────────────────────────────────────── */}
          <div style={{
            background: '#faf9ff', border: '1px solid #ede9fe',
            borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e1b4b' }}>{claim.memberName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provider</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{claim.providerName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed Amount</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1d4ed8' }}>{formatCurrency(claim.totalBilledAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{formatDate(claim.submittedAt)}</div>
            </div>
          </div>

          {/* ── API / form errors ─────────────────────────────────────────── */}
          {(error || formError) && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:9,
              background: '#fff5f5', border: '1px solid #fca5a5',
              borderRadius: 8, padding: '10px 13px', marginBottom: 16,
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:14, marginTop:1, flexShrink:0 }} />
              <span style={{ color:'#dc2626', fontSize:'0.8rem' }}>{error || formError}</span>
            </div>
          )}

          {/* ── Decision selector ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display:'block', fontSize:'0.72rem', fontWeight:700,
              color:'#4c1d95', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8,
            }}>
              Decision <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DECISIONS.map((d) => (
                <label key={d.value} style={{
                  display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer',
                  padding:'11px 14px', borderRadius:10,
                  border: `2px solid ${decision === d.value ? d.border : '#e5e7eb'}`,
                  background: decision === d.value ? d.bg : 'white',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="decision"
                    value={d.value}
                    checked={decision === d.value}
                    onChange={() => { setDecision(d.value); setFormError(null); }}
                    style={{ marginTop: 3, flexShrink: 0, accentColor: d.color }}
                  />
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <i className={`bi ${d.icon}`} style={{ color: d.color, fontSize: 14 }} />
                      <span style={{ fontWeight:700, fontSize:'0.84rem', color: decision === d.value ? d.color : '#1e1b4b' }}>
                        {d.label}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'#6b7280', marginTop:2 }}>
                      {d.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── Payable amount (Paid / Partial only) ─────────────────────── */}
          {needsAmount && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display:'block', fontSize:'0.72rem', fontWeight:700,
                color:'#4c1d95', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:5,
              }}>
                Payable Amount (₹) <span style={{ color:'#ef4444' }}>*</span>
                <span style={{ fontWeight:400, color:'#9ca3af', textTransform:'none', marginLeft:6 }}>
                  max {formatCurrency(claim.totalBilledAmount)}
                </span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder={`e.g. ${claim.totalBilledAmount}`}
                value={payableAmount}
                onChange={(e) => { setPayableAmount(e.target.value); setFormError(null); }}
                style={inp}
                onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
              />
              {decision === 'Paid' && (
                <div style={{ fontSize:'0.7rem', color:'#6b7280', marginTop:4 }}>
                  Leave blank or enter the full billed amount to approve the complete claim.
                </div>
              )}
            </div>
          )}

          {/* ── Decision notes (required) ─────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display:'block', fontSize:'0.72rem', fontWeight:700,
              color:'#4c1d95', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:5,
            }}>
              Decision Notes <span style={{ color:'#ef4444' }}>*</span>
              <span style={{ fontWeight:400, color:'#9ca3af', textTransform:'none', marginLeft:6 }}>
                required · min 10 characters
              </span>
            </label>
            <textarea
              rows={4}
              placeholder={
                isDeny
                  ? 'Explain why this claim is being denied (e.g. policy exclusion, insufficient documentation, suspected fraud)…'
                  : 'Document your reasoning for this approval decision (e.g. documents verified, amount within policy limits, fraud cleared)…'
              }
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setFormError(null); }}
              style={{ ...inp, resize:'vertical', lineHeight:1.5 }}
              onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
              onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
            />
            <div style={{ fontSize:'0.68rem', color: notes.trim().length > 0 && notes.trim().length < 10 ? '#ef4444' : '#9ca3af', marginTop:3 }}>
              {notes.trim().length} / 10 minimum characters
            </div>
          </div>

          {/* ── Warning for Deny ─────────────────────────────────────────── */}
          {isDeny && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:9,
              background:'#fff5f5', border:'1px solid #fca5a5',
              borderRadius:9, padding:'10px 13px', marginBottom:20,
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:13, marginTop:1, flexShrink:0 }} />
              <span style={{ fontSize:'0.78rem', color:'#dc2626' }}>
                Denying this claim will set it to <strong>Rejected</strong> and notify the provider. This action cannot be undone.
              </span>
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
          padding:'14px 24px 20px', borderTop:'1px solid #f3f0ff',
        }}>
          <button type="button" onClick={onHide} disabled={loading} style={{
            padding:'9px 20px', borderRadius:10,
            border:'1.5px solid #e5e7eb', background:'white',
            color:'#6b7280', fontWeight:600, fontSize:'0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || !decision}
            style={{
              padding:'9px 22px', borderRadius:10, border:'none',
              background: !decision || loading
                ? '#e5e7eb'
                : isDeny
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: !decision || loading ? '#9ca3af' : 'white',
              fontWeight:700, fontSize:'0.85rem',
              cursor: !decision || loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:7,
              boxShadow: !decision || loading ? 'none' : '0 4px 12px rgba(0,0,0,0.2)',
              transition:'all 0.15s',
            }}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} />Recording…</>
            ) : isDeny ? (
              <><i className="bi bi-x-circle-fill" />Deny Claim</>
            ) : (
              <><i className="bi bi-check-circle-fill" />Confirm Decision</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
