import { useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { scoreClaim, getFraudScore } from '../../../../services/fraud/fraudService';
import { scoreColor, formatDateTime } from '../utils/fraudHelpers';

const FACTOR_META = {
  duplicate_service_code:    { label: 'Duplicate Service Code',       desc: 'Same code billed in another claim for this member', points: 25, icon: 'bi-files' },
  high_billing_frequency:    { label: 'High Billing Frequency',       desc: 'Provider submitted >10 claims in 30 days', points: 20, icon: 'bi-graph-up' },
  amount_spike_300pct:       { label: 'Amount Spike (300%+)',          desc: 'Billed amount is 300%+ above provider average', points: 20, icon: 'bi-currency-rupee' },
  repeated_procedure_pattern:{ label: 'Repeated Procedure Pattern',    desc: 'Same procedure ≥3 times across provider claims', points: 15, icon: 'bi-arrow-repeat' },
  first_time_provider:       { label: 'First-Time Provider',           desc: 'No prior claims from this provider', points: 0, icon: 'bi-person-plus' },
};

// ── Score gauge ring (SVG) ────────────────────────────────────────────────────
function ScoreGauge({ score, color, label }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg viewBox="0 0 120 120" width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600 }}>/100</span>
        </div>
      </div>
      <span style={{
        fontWeight: 700, fontSize: '0.8rem',
        color: 'white', background: color,
        padding: '3px 14px', borderRadius: 999,
      }}>{label}</span>
    </div>
  );
}

export default function ScoreClaimModal({ show, onHide, onScored }) {
  const [claimId, setClaimId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);

  function reset() {
    setClaimId('');
    setLoading(false);
    setError('');
    setResult(null);
  }

  function handleClose() {
    reset();
    onHide();
  }

  async function handleScore() {
    if (!claimId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await scoreClaim(Number(claimId));
      setResult(data);
      if (onScored) onScored(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to score claim.';
      setError(typeof msg === 'string' ? msg : 'Failed to score claim.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckExisting() {
    if (!claimId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getFraudScore(Number(claimId));
      setResult(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No existing score found. Click "Run Scoring" to generate one.');
      } else {
        const msg = err.response?.data?.message || err.response?.data || 'Failed to fetch score.';
        setError(typeof msg === 'string' ? msg : 'Failed to fetch score.');
      }
    } finally {
      setLoading(false);
    }
  }

  const sc = result ? scoreColor(result.scoreValue) : null;

  let factors = [];
  if (result?.factorsJSON) {
    try {
      const raw = JSON.parse(result.factorsJSON);
      factors = raw.map(f => {
        const meta = FACTOR_META[f] || { label: f, desc: '', points: 0, icon: 'bi-question-circle' };
        return { key: f, ...meta };
      });
    } catch {
      factors = [{ key: 'error', label: 'Could not parse risk factors', desc: 'Raw data may be malformed.', points: 0, icon: 'bi-exclamation-circle' }];
    }
  }

  const totalPoints = factors.reduce((s, f) => s + (f.points || 0), 0);
  const isHighRisk  = result && result.scoreValue >= 70;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">

      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-55, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-25, left:60, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:13,
              background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(8px)', flexShrink:0,
            }}>
              <i className="bi bi-speedometer2" style={{ fontSize:'1.35rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>Fraud Score — Claim Analysis</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>Run or check an ML-powered fraud risk score for any claim</div>
            </div>
          </div>
          <button onClick={handleClose} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:16,
          }}>✕</button>
        </div>
      </div>

      <Modal.Body style={{ padding:'22px 24px', background:'white' }}>

        {/* ── Input section ────────────────────────────────── */}
        <div style={{
          background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          border:'1px solid #ddd6fe', borderRadius:12,
          padding:'16px 18px', marginBottom:20,
        }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            <i className="bi bi-search me-1"></i>Claim Lookup
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ flex:'1 1 180px' }}>
              <label style={{ fontSize:'0.72rem', fontWeight:600, color:'#4c1d95', display:'block', marginBottom:5 }}>
                Claim ID
              </label>
              <input
                type="number"
                placeholder="e.g. 42"
                value={claimId}
                onChange={e => setClaimId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && claimId.trim()) handleScore(); }}
                style={{
                  width:'100%', padding:'9px 12px',
                  border:'1.5px solid #a78bfa', borderRadius:10,
                  fontSize:'0.85rem', color:'#1e1b4b',
                  background: claimId ? '#faf5ff' : 'white',
                  outline:'none',
                }}
              />
            </div>

            {/* Check Existing */}
            <button
              onClick={handleCheckExisting}
              disabled={loading || !claimId.trim()}
              style={{
                padding:'9px 16px', borderRadius:10, fontWeight:700, fontSize:'0.82rem',
                border:'1.5px solid #c4b5fd', background:'white', color:'#7c3aed',
                cursor: loading || !claimId.trim() ? 'not-allowed' : 'pointer',
                opacity: !claimId.trim() ? 0.5 : 1,
                display:'flex', alignItems:'center', gap:6, transition:'all 0.15s',
                whiteSpace:'nowrap',
              }}
              onMouseEnter={(e) => { if (!loading && claimId.trim()) { e.currentTarget.style.background='#f5f3ff'; e.currentTarget.style.borderColor='#a78bfa'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#c4b5fd'; }}
            >
              <i className="bi bi-clock-history" style={{ fontSize:13 }}></i>
              Check Existing
            </button>

            {/* Run Scoring */}
            <button
              onClick={handleScore}
              disabled={loading || !claimId.trim()}
              style={{
                padding:'9px 18px', borderRadius:10, fontWeight:700, fontSize:'0.82rem',
                border:'none',
                background: loading || !claimId.trim()
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: loading || !claimId.trim() ? '#9ca3af' : 'white',
                cursor: loading || !claimId.trim() ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:6,
                boxShadow: !loading && claimId.trim() ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}
            >
              {loading
                ? <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} />Scoring…</>
                : <><i className="bi bi-play-fill" style={{ fontSize:12 }}></i>Run Scoring</>}
            </button>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10,
            background:'#fff5f5', border:'1.5px solid #fca5a5',
            borderRadius:10, padding:'12px 14px', marginBottom:16,
          }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:14, marginTop:1, flexShrink:0 }}></i>
            <span style={{ color:'#dc2626', fontSize:'0.83rem' }}>{error}</span>
          </div>
        )}

        {/* ── Result ───────────────────────────────────────── */}
        {result && (
          <div style={{
            border:'1.5px solid #f3f0ff', borderRadius:14,
            background:'#faf9ff', overflow:'hidden',
          }}>

            {/* Score summary row */}
            <div style={{
              display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
              padding:'20px 22px',
              background:'white',
              borderBottom:'1px solid #f3f0ff',
            }}>
              {/* Gauge */}
              <ScoreGauge score={result.scoreValue} color={sc.color} label={sc.label} />

              {/* Meta info */}
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Claim</div>
                  <div style={{ fontFamily:'monospace', fontWeight:700, color:'#4c1d95', fontSize:'0.95rem' }}>
                    CLM-{result.claimID}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>Model</div>
                    <span style={{
                      background:'#f3f0ff', color:'#7c3aed',
                      padding:'2px 9px', borderRadius:6,
                      fontSize:'0.75rem', fontWeight:600,
                    }}>{result.scoringModel}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>Generated</div>
                    <div style={{ fontSize:'0.77rem', color:'#6b7280' }}>{formatDateTime(result.generatedAt)}</div>
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ marginTop:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:'0.7rem', color:'#9ca3af' }}>Risk Level</span>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:sc.color }}>{result.scoreValue}/100</span>
                  </div>
                  <div style={{ height:10, borderRadius:99, background:'#f3f4f6', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:99,
                      width:`${result.scoreValue}%`,
                      background: result.scoreValue >= 70
                        ? 'linear-gradient(90deg, #f97316, #ef4444)'
                        : result.scoreValue >= 40
                        ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                        : 'linear-gradient(90deg, #34d399, #10b981)',
                      transition:'width 0.8s ease',
                    }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:'0.62rem', color:'#10b981', fontWeight:600 }}>Low</span>
                    <span style={{ fontSize:'0.62rem', color:'#f59e0b', fontWeight:600 }}>Medium</span>
                    <span style={{ fontSize:'0.62rem', color:'#ef4444', fontWeight:600 }}>High</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {factors.length > 0 && (
              <div style={{ padding:'18px 22px' }}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:12,
                }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#1e1b4b', display:'flex', alignItems:'center', gap:6 }}>
                    <i className="bi bi-list-check" style={{ color:'#7c3aed' }}></i>
                    Risk Factors Detected
                  </div>
                  {totalPoints > 0 && (
                    <span style={{
                      background:'#fee2e2', color:'#dc2626',
                      padding:'2px 10px', borderRadius:999,
                      fontSize:'0.72rem', fontWeight:700,
                    }}>+{totalPoints} pts total</span>
                  )}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {factors.map((f, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:12,
                      background: f.points > 0 ? '#fff5f5' : '#f9fafb',
                      border:`1px solid ${f.points > 0 ? '#fecaca' : '#f3f4f6'}`,
                      borderRadius:10, padding:'10px 14px',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width:34, height:34, borderRadius:9, flexShrink:0,
                        background: f.points > 0 ? '#fee2e2' : '#f3f4f6',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <i className={`bi ${f.icon}`} style={{
                          fontSize:14,
                          color: f.points > 0 ? '#dc2626' : '#9ca3af',
                        }}></i>
                      </div>
                      {/* Text */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:700, color: f.points > 0 ? '#991b1b' : '#374151' }}>
                          {f.label}
                        </div>
                        {f.desc && (
                          <div style={{ fontSize:'0.71rem', color:'#9ca3af', marginTop:1 }}>{f.desc}</div>
                        )}
                      </div>
                      {/* Points badge */}
                      <span style={{
                        flexShrink:0,
                        background: f.points > 0 ? '#fee2e2' : '#f3f4f6',
                        color: f.points > 0 ? '#dc2626' : '#9ca3af',
                        padding:'3px 9px', borderRadius:999,
                        fontSize:'0.72rem', fontWeight:700,
                        whiteSpace:'nowrap',
                      }}>
                        {f.points > 0 ? `+${f.points} pts` : 'Info'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High Risk Alert */}
            {isHighRisk && (
              <div style={{
                margin:'0 22px 18px',
                display:'flex', alignItems:'flex-start', gap:12,
                background:'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                border:'1.5px solid #fca5a5', borderRadius:12, padding:'14px 16px',
              }}>
                <div style={{
                  width:38, height:38, borderRadius:10, flexShrink:0,
                  background:'#ef4444',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className="bi bi-shield-x" style={{ color:'white', fontSize:18 }}></i>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'#991b1b', fontSize:'0.88rem', marginBottom:3 }}>
                    High Risk Detected
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'#b91c1c', lineHeight:1.5 }}>
                    A fraud case has been <strong>automatically opened</strong> for this claim due to a score ≥ 70.
                    The claim is flagged for manual review.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'flex-end',
        padding:'14px 24px 20px', background:'white',
        borderTop:'1px solid #f3f0ff', borderRadius:'0 0 12px 12px',
      }}>
        <button onClick={handleClose} style={{
          padding:'9px 22px', borderRadius:10,
          border:'1.5px solid #e5e7eb', background:'white',
          color:'#6b7280', fontWeight:600, fontSize:'0.85rem', cursor:'pointer',
        }}>Close</button>
      </div>
    </Modal>
  );
}
