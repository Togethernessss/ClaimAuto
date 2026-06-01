import { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { getFraudScore } from '../../../../services/fraud/fraudService';
import {
  formatDateTime, scoreColor,
  priorityStyle, priorityIcon,
  caseStatusStyle, caseStatusIcon,
  outcomeStyle, outcomeIcon,
} from '../utils/fraudHelpers';

// ── FACTOR_META ───────────────────────────────────────────────────────────────
const FACTOR_META = {
  duplicate_service_code:     { label: 'Duplicate Service Code',      desc: 'Same code billed in another claim for this member',    points: 25, icon: 'bi-files' },
  high_billing_frequency:     { label: 'High Billing Frequency',      desc: 'Provider submitted >10 claims in 30 days',             points: 20, icon: 'bi-graph-up' },
  amount_spike_300pct:        { label: 'Amount Spike (300%+)',         desc: 'Billed amount is 300%+ above provider average',        points: 20, icon: 'bi-currency-rupee' },
  repeated_procedure_pattern: { label: 'Repeated Procedure Pattern',  desc: 'Same procedure ≥3 times across provider claims',       points: 15, icon: 'bi-arrow-repeat' },
  first_time_provider:        { label: 'First-Time Provider',         desc: 'No prior claims from this provider',                   points:  0, icon: 'bi-person-plus' },
};

// ── Small info field box ──────────────────────────────────────────────────────
function InfoRow({ icon, label, children }) {
  return (
    <div style={{
      background: '#f9fafb',
      border: '1.5px solid #f3f0ff',
      borderRadius: 10,
      padding: '10px 14px',
    }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700,
        color: '#7c3aed', textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 9 }}></i>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── SVG Score Gauge ───────────────────────────────────────────────────────────
function ScoreGauge({ score, color, label }) {
  const radius       = 46;
  const circumference = 2 * Math.PI * radius;
  const progress      = (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 118, height: 118 }}>
        <svg viewBox="0 0 110 110" width={118} height={118}
          style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="55" cy="55" r={radius}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>/100</span>
        </div>
      </div>
      <span style={{
        fontWeight: 700, fontSize: '0.75rem', color: 'white',
        background: color, padding: '2px 12px', borderRadius: 999,
      }}>
        {label}
      </span>
    </div>
  );
}

export default function CaseDetailModal({ show, onHide, fraudCase }) {
  const [score,   setScore]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Load fraud score whenever the modal opens for a new case
  useEffect(() => {
    if (show && fraudCase) {
      setActiveTab('info');
      setLoading(true);
      getFraudScore(fraudCase.claimID)
        .then(data => setScore(data))
        .catch(() => setScore(null))
        .finally(() => setLoading(false));
    } else {
      setScore(null);
    }
  }, [show, fraudCase]);

  if (!fraudCase) return null;

  const pStyle = priorityStyle(fraudCase.priority);
  const sStyle = caseStatusStyle(fraudCase.status);
  const sc     = score ? scoreColor(score.scoreValue) : null;

  // Parse risk factors
  let factors = [];
  if (score?.factorsJSON) {
    try {
      const raw = JSON.parse(score.factorsJSON);
      factors = raw.map(f => {
        const meta = FACTOR_META[f] || { label: f, desc: '', points: 0, icon: 'bi-question-circle' };
        return { key: f, ...meta };
      });
    } catch { factors = []; }
  }

  // Parse evidence URIs
  let evidence = [];
  if (fraudCase.evidenceURIsJSON) {
    try { evidence = JSON.parse(fraudCase.evidenceURIsJSON); } catch { evidence = []; }
  }

  const totalPoints = factors.reduce((s, f) => s + (f.points || 0), 0);
  const isHighRisk  = score && score.scoreValue >= 70;
  const isResolved  = fraudCase.status === 'Resolved';

  // Outcome style
  const oStyle = fraudCase.outcome ? outcomeStyle(fraudCase.outcome) : null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">

      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-55, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:90,  height:90,  borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-25, left:60, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            {/* Icon box */}
            <div style={{
              width:48, height:48, borderRadius:13, flexShrink:0,
              background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(8px)',
            }}>
              <i className="bi bi-shield-exclamation" style={{ fontSize:'1.35rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>
                Fraud Case FC-{fraudCase.caseID}
              </div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>
                Linked to Claim CLM-{fraudCase.claimID}
              </div>
            </div>
          </div>

          {/* Status chip in header */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:5,
              background:'rgba(255,255,255,0.18)',
              color:'white', backdropFilter:'blur(8px)',
              padding:'4px 12px', borderRadius:999,
              fontSize:'0.75rem', fontWeight:700,
            }}>
              <i className={`bi ${caseStatusIcon(fraudCase.status)}`} style={{ fontSize:10 }}></i>
              {fraudCase.status === 'UnderInvestigation' ? 'Investigating' : fraudCase.status}
            </span>
            <button onClick={onHide} style={{
              background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
              width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'white', fontSize:16,
            }}>✕</button>
          </div>
        </div>

        {/* ── Tab switcher (inside header) ────────────────── */}
        <div style={{ display:'flex', gap:4, marginTop:16, position:'relative', zIndex:1 }}>
          {[
            { key:'info',  icon:'bi-info-circle-fill',  label:'Case Info' },
            { key:'score', icon:'bi-speedometer2',       label:'Fraud Score' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding:'7px 16px', borderRadius:8, border:'none',
                fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                background: activeTab === tab.key
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.14)',
                color: activeTab === tab.key ? '#4c1d95' : 'rgba(255,255,255,0.8)',
                display:'inline-flex', alignItems:'center', gap:6,
                transition:'all 0.15s',
                backdropFilter:'blur(8px)',
              }}
            >
              <i className={`bi ${tab.icon}`} style={{ fontSize:11 }}></i>
              {tab.label}
              {tab.key === 'score' && score && (
                <span style={{
                  background: sc?.color, color:'white',
                  fontSize:'0.62rem', fontWeight:800,
                  padding:'1px 6px', borderRadius:999, marginLeft:2,
                }}>
                  {score.scoreValue}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Modal Body ───────────────────────────────────────────── */}
      <Modal.Body style={{ padding:'22px 24px', background:'white', minHeight:360 }}>

        {/* ════════════════════════════════════════════════════════
            TAB 1 — Case Info
        ════════════════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <div>

            {/* 2-column info grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>

              {/* Claim ID */}
              <InfoRow icon="bi-file-medical" label="Claim ID">
                <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:'0.9rem', color:'#4c1d95' }}>
                  CLM-{fraudCase.claimID}
                </span>
              </InfoRow>

              {/* Priority */}
              <InfoRow icon="bi-flag-fill" label="Priority">
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background: pStyle.bg, color: pStyle.color,
                  padding:'3px 10px', borderRadius:999,
                  fontSize:'0.75rem', fontWeight:700,
                }}>
                  <i className={`bi ${priorityIcon(fraudCase.priority)}`} style={{ fontSize:9 }}></i>
                  {fraudCase.priority}
                </span>
              </InfoRow>

              {/* Status */}
              <InfoRow icon="bi-activity" label="Status">
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background: sStyle.bg, color: sStyle.color,
                  padding:'3px 10px', borderRadius:999,
                  fontSize:'0.75rem', fontWeight:700,
                }}>
                  <i className={`bi ${caseStatusIcon(fraudCase.status)}`} style={{ fontSize:9 }}></i>
                  {fraudCase.status === 'UnderInvestigation' ? 'Investigating' : fraudCase.status}
                </span>
              </InfoRow>

              {/* Opened By */}
              <InfoRow icon="bi-person-fill" label="Opened By">
                <span style={{ fontWeight:600, fontSize:'0.88rem', color:'#1e1b4b' }}>
                  {fraudCase.openedByName || '—'}
                </span>
              </InfoRow>

              {/* Opened At */}
              <InfoRow icon="bi-calendar3" label="Opened At">
                <span style={{ fontSize:'0.85rem', color:'#374151' }}>
                  {formatDateTime(fraudCase.openedAt)}
                </span>
              </InfoRow>

              {/* Outcome — only if present */}
              {fraudCase.outcome && (
                <InfoRow icon="bi-patch-check-fill" label="Outcome">
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    background: oStyle.bg, color: oStyle.color,
                    padding:'3px 10px', borderRadius:999,
                    fontSize:'0.75rem', fontWeight:700,
                  }}>
                    <i className={`bi ${outcomeIcon(fraudCase.outcome)}`} style={{ fontSize:9 }}></i>
                    {fraudCase.outcome}
                  </span>
                </InfoRow>
              )}

              {/* Resolved At — only if resolved */}
              {fraudCase.resolvedAt && (
                <InfoRow icon="bi-check-circle-fill" label="Resolved At">
                  <span style={{ fontSize:'0.85rem', color:'#059669', fontWeight:600 }}>
                    {formatDateTime(fraudCase.resolvedAt)}
                  </span>
                </InfoRow>
              )}

            </div>

            {/* ── Investigation Notes ──────────────────────── */}
            {fraudCase.investigationNotes && (
              <div style={{
                background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border:'1px solid #ddd6fe', borderRadius:12,
                padding:'14px 16px', marginBottom:14,
              }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:7,
                  fontSize:'0.75rem', fontWeight:700, color:'#7c3aed',
                  textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8,
                }}>
                  <div style={{
                    width:26, height:26, borderRadius:7,
                    background:'linear-gradient(135deg, #667eea, #764ba2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <i className="bi bi-journal-text" style={{ color:'white', fontSize:11 }}></i>
                  </div>
                  Investigation Notes
                </div>
                <p style={{ margin:0, fontSize:'0.83rem', color:'#374151', whiteSpace:'pre-wrap', lineHeight:1.6 }}>
                  {fraudCase.investigationNotes}
                </p>
              </div>
            )}

            {/* ── Evidence URIs ────────────────────────────── */}
            {evidence.length > 0 && (
              <div style={{
                background:'white', border:'1.5px solid #f3f0ff',
                borderRadius:12, padding:'14px 16px',
              }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:7,
                  fontSize:'0.75rem', fontWeight:700, color:'#7c3aed',
                  textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10,
                }}>
                  <div style={{
                    width:26, height:26, borderRadius:7,
                    background:'#ede9fe',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <i className="bi bi-paperclip" style={{ color:'#7c3aed', fontSize:11 }}></i>
                  </div>
                  Evidence ({evidence.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {evidence.map((uri, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:8,
                      background:'#f9fafb', border:'1px solid #e5e7eb',
                      borderRadius:8, padding:'7px 12px',
                    }}>
                      <i className="bi bi-link-45deg" style={{ color:'#7c3aed', fontSize:13 }}></i>
                      <span style={{ fontSize:'0.78rem', color:'#4c1d95', wordBreak:'break-all' }}>{uri}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB 2 — Fraud Score
        ════════════════════════════════════════════════════════ */}
        {activeTab === 'score' && (
          <div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'48px 0' }}>
                <div style={{
                  width:52, height:52, borderRadius:'50%',
                  background:'linear-gradient(135deg, #667eea, #764ba2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 14px',
                }}>
                  <Spinner animation="border" variant="light" size="sm" />
                </div>
                <div style={{ color:'#6b7280', fontSize:'0.85rem' }}>Loading fraud score…</div>
              </div>
            ) : !score ? (
              <div style={{ textAlign:'center', padding:'48px 0' }}>
                <div style={{
                  width:68, height:68, borderRadius:'50%',
                  background:'linear-gradient(135deg, #f3f0ff, #faf5ff)',
                  border:'2px solid #ede9fe',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 16px',
                }}>
                  <i className="bi bi-speedometer2" style={{ fontSize:'1.8rem', color:'#7c3aed' }}></i>
                </div>
                <div style={{ fontWeight:700, color:'#374151', marginBottom:4 }}>No Score Available</div>
                <div style={{ fontSize:'0.82rem', color:'#9ca3af' }}>
                  No fraud score found for this claim. Use the Score Claim tool to generate one.
                </div>
              </div>
            ) : (
              <div>
                {/* Score summary card */}
                <div style={{
                  background:'white', border:'1.5px solid #f3f0ff',
                  borderRadius:14, padding:'18px 20px', marginBottom:16,
                  display:'flex', alignItems:'center', gap:22, flexWrap:'wrap',
                }}>
                  {/* Gauge */}
                  <ScoreGauge score={score.scoreValue} color={sc.color} label={sc.label} />

                  {/* Meta + bar */}
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Model</div>
                        <span style={{ background:'#f3f0ff', color:'#7c3aed', padding:'2px 8px', borderRadius:6, fontSize:'0.75rem', fontWeight:600 }}>
                          {score.scoringModel}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Generated</div>
                        <div style={{ fontSize:'0.77rem', color:'#6b7280' }}>{formatDateTime(score.generatedAt)}</div>
                      </div>
                    </div>

                    {/* Score progress bar */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:'0.68rem', color:'#9ca3af' }}>Risk level</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:700, color:sc.color }}>{score.scoreValue}/100</span>
                      </div>
                      <div style={{ height:10, borderRadius:99, background:'#f3f4f6', overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:99,
                          width:`${score.scoreValue}%`,
                          background: score.scoreValue >= 70
                            ? 'linear-gradient(90deg, #f97316, #ef4444)'
                            : score.scoreValue >= 40
                            ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                            : 'linear-gradient(90deg, #34d399, #10b981)',
                          transition:'width 0.8s ease',
                        }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                        <span style={{ fontSize:'0.6rem', color:'#10b981', fontWeight:600 }}>Low</span>
                        <span style={{ fontSize:'0.6rem', color:'#f59e0b', fontWeight:600 }}>Medium</span>
                        <span style={{ fontSize:'0.6rem', color:'#ef4444', fontWeight:600 }}>High</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                {factors.length > 0 && (
                  <div>
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      marginBottom:10,
                    }}>
                      <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#1e1b4b', display:'flex', alignItems:'center', gap:6 }}>
                        <i className="bi bi-list-check" style={{ color:'#7c3aed' }}></i>
                        Risk Factors Detected
                      </div>
                      {totalPoints > 0 && (
                        <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 10px', borderRadius:999, fontSize:'0.72rem', fontWeight:700 }}>
                          +{totalPoints} pts total
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {factors.map((f, i) => (
                        <div key={i} style={{
                          display:'flex', alignItems:'center', gap:10,
                          background: f.points > 0 ? '#fff5f5' : '#f9fafb',
                          border:`1px solid ${f.points > 0 ? '#fecaca' : '#f3f4f6'}`,
                          borderRadius:10, padding:'9px 14px',
                        }}>
                          <div style={{
                            width:32, height:32, borderRadius:8, flexShrink:0,
                            background: f.points > 0 ? '#fee2e2' : '#f3f4f6',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <i className={`bi ${f.icon}`} style={{ fontSize:13, color: f.points > 0 ? '#dc2626' : '#9ca3af' }}></i>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'0.82rem', fontWeight:700, color: f.points > 0 ? '#991b1b' : '#374151' }}>{f.label}</div>
                            {f.desc && <div style={{ fontSize:'0.7rem', color:'#9ca3af', marginTop:1 }}>{f.desc}</div>}
                          </div>
                          <span style={{
                            flexShrink:0,
                            background: f.points > 0 ? '#fee2e2' : '#f3f4f6',
                            color: f.points > 0 ? '#dc2626' : '#9ca3af',
                            padding:'3px 9px', borderRadius:999,
                            fontSize:'0.71rem', fontWeight:700,
                          }}>
                            {f.points > 0 ? `+${f.points} pts` : 'Info'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* High Risk Banner */}
                {isHighRisk && (
                  <div style={{
                    display:'flex', alignItems:'flex-start', gap:12, marginTop:14,
                    background:'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                    border:'1.5px solid #fca5a5', borderRadius:12, padding:'14px 16px',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:9, flexShrink:0,
                      background:'#ef4444',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <i className="bi bi-shield-x" style={{ color:'white', fontSize:16 }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, color:'#991b1b', fontSize:'0.86rem', marginBottom:3 }}>High Risk Detected</div>
                      <div style={{ fontSize:'0.77rem', color:'#b91c1c', lineHeight:1.5 }}>
                        Score ≥ 70 — A fraud case was automatically opened.
                        This claim is flagged for mandatory manual review.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </Modal.Body>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'flex-end',
        padding:'14px 24px 20px', background:'white',
        borderTop:'1px solid #f3f0ff', borderRadius:'0 0 12px 12px',
      }}>
        <button onClick={onHide} style={{
          padding:'9px 24px', borderRadius:10,
          border:'1.5px solid #e5e7eb', background:'white',
          color:'#6b7280', fontWeight:600, fontSize:'0.85rem', cursor:'pointer',
          transition:'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background='#f9fafb'; e.currentTarget.style.borderColor='#d1d5db'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e5e7eb'; }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
