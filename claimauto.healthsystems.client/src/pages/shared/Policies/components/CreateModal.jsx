import { Modal, Spinner } from 'react-bootstrap';

// ── Reusable field label ──────────────────────────────────────────────────────
function FieldLabel({ icon, label, required, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{
        display:'flex', alignItems:'center', gap:5,
        fontSize:'0.75rem', fontWeight:700,
        color:'#4c1d95', textTransform:'uppercase', letterSpacing:'0.04em',
      }}>
        <i className={`bi ${icon}`} style={{ fontSize:10 }}></i>
        {label}
        {required && <span style={{ color:'#ef4444' }}>*</span>}
      </label>
      {hint && (
        <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:1 }}>
          <i className="bi bi-info-circle me-1"></i>{hint}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width:'100%', padding:'9px 12px',
  border:'1.5px solid #e5e7eb', borderRadius:10,
  fontSize:'0.85rem', color:'#1e1b4b',
  background:'#f9fafb', outline:'none',
  transition:'border-color 0.15s',
  boxSizing:'border-box',
};

const SERVICE_META = {
  Inpatient:   { icon:'bi-hospital',           color:'#3b82f6', bg:'#dbeafe' },
  Outpatient:  { icon:'bi-person-walking',      color:'#10b981', bg:'#d1fae5' },
  Pharmacy:    { icon:'bi-capsule',             color:'#8b5cf6', bg:'#ede9fe' },
  Emergency:   { icon:'bi-exclamation-octagon', color:'#ef4444', bg:'#fee2e2' },
};

export default function CreateModal({
  show,
  loading,
  error,
  form,
  onHide,
  onFieldChange,
  onSubmit,
}) {
  // Parse covered services from JSON
  function getCoveredServices() {
    try {
      const parsed = JSON.parse(form.coverageRulesJSON || '{}');
      return (parsed.coveredServices || []).map(s => s.toLowerCase());
    } catch { return []; }
  }

  function toggleService(service) {
    try {
      const parsed   = JSON.parse(form.coverageRulesJSON || '{}');
      const services = parsed.coveredServices || [];
      const updated  = services.map(s => s.toLowerCase()).includes(service.toLowerCase())
        ? services.filter(s => s.toLowerCase() !== service.toLowerCase())
        : [...services, service.toLowerCase()];
      onFieldChange('coverageRulesJSON')({
        target: { value: JSON.stringify({ coveredServices: updated }) }
      });
    } catch {
      onFieldChange('coverageRulesJSON')({
        target: { value: JSON.stringify({ coveredServices: [service.toLowerCase()] }) }
      });
    }
  }

  const coveredServices = getCoveredServices();

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" scrollable>

      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius:'12px 12px 0 0',
        padding:'20px 26px',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-55, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-25, left:70, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:13,
              background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(8px)', flexShrink:0,
            }}>
              <i className="bi bi-plus-circle-fill" style={{ fontSize:'1.35rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>Create New Policy</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>Define a new insurance plan for your organisation</div>
            </div>
          </div>
          <button onClick={onHide} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:16,
          }}>✕</button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <form onSubmit={onSubmit}>
        <div style={{ overflowY:'auto', maxHeight:'65vh', padding:'22px 26px 8px', background:'white' }}>

          {error && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fff5f5', border:'1.5px solid #fca5a5',
              borderRadius:10, padding:'11px 14px', marginBottom:16,
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:14, flexShrink:0 }}></i>
              <span style={{ color:'#dc2626', fontSize:'0.83rem' }}>{error}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              SECTION 1 — Plan Identity
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border:'1px solid #ddd6fe', borderRadius:12,
            padding:'14px 16px', marginBottom:18,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-shield-fill-check me-1"></i>Plan Identity
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Plan Code */}
              <div>
                <FieldLabel icon="bi-upc" label="Plan Code" required hint="Unique. Cannot be changed after creation." />
                <input
                  placeholder="e.g. FAMILY-GOLD-2025"
                  value={form.planCode}
                  onChange={onFieldChange('planCode')}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                  onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                />
              </div>

              {/* Plan Name */}
              <div>
                <FieldLabel icon="bi-tag-fill" label="Plan Name" required />
                <input
                  placeholder="e.g. Family Gold Health Plan"
                  value={form.planName}
                  onChange={onFieldChange('planName')}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                  onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                />
              </div>

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 2 — Financial Details
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'white', border:'1.5px solid #f3f0ff',
            borderRadius:12, padding:'14px 16px', marginBottom:18,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-cash-coin me-1"></i>Financial Details
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Sum Insured */}
              <div>
                <FieldLabel icon="bi-currency-rupee" label="Sum Insured (₹)" required hint="Maximum total the insurer pays in a policy year." />
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                    color:'#7c3aed', fontWeight:700, fontSize:13,
                  }}>₹</span>
                  <input
                    type="number" min="0" step="0.01"
                    placeholder="500000"
                    value={form.sumInsured}
                    onChange={onFieldChange('sumInsured')}
                    required
                    style={{ ...inputStyle, paddingLeft:24 }}
                    onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                    onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                  />
                </div>
              </div>

              {/* Deductible Amount */}
              <div>
                <FieldLabel icon="bi-percent" label="Deductible Amount (₹)" />
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                    color:'#9ca3af', fontWeight:700, fontSize:13,
                  }}>₹</span>
                  <input
                    type="number" min="0" step="0.01"
                    placeholder="5000"
                    value={form.deductibleAmount}
                    onChange={onFieldChange('deductibleAmount')}
                    style={{ ...inputStyle, paddingLeft:24 }}
                    onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                    onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — Validity Period
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'white', border:'1.5px solid #f3f0ff',
            borderRadius:12, padding:'14px 16px', marginBottom:18,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-calendar3 me-1"></i>Validity Period
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Effective From */}
              <div>
                <FieldLabel icon="bi-calendar-check" label="Effective From" required hint="Cannot be changed after creation." />
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={onFieldChange('effectiveFrom')}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                  onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                />
              </div>

              {/* Effective To */}
              <div>
                <FieldLabel icon="bi-calendar-x" label="Effective To" hint="Leave blank for auto-renewing plans." />
                <input
                  type="date"
                  value={form.effectiveTo}
                  onChange={onFieldChange('effectiveTo')}
                  min={form.effectiveFrom || undefined}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                  onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                />
              </div>

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 4 — Covered Services
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'white', border:'1.5px solid #f3f0ff',
            borderRadius:12, padding:'14px 16px',
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-clipboard2-pulse me-1"></i>Covered Services
              <span style={{ fontWeight:400, color:'#9ca3af', textTransform:'none', letterSpacing:0, marginLeft:6 }}>Select all that apply</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {Object.entries(SERVICE_META).map(([service, meta]) => {
                const isChecked = coveredServices.includes(service.toLowerCase());
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'11px 14px', borderRadius:10, cursor:'pointer',
                      border: isChecked ? `2px solid ${meta.color}` : '1.5px solid #e5e7eb',
                      background: isChecked ? meta.bg : '#f9fafb',
                      transition:'all 0.15s',
                    }}
                  >
                    <div style={{
                      width:34, height:34, borderRadius:9, flexShrink:0,
                      background: isChecked ? meta.color : '#e5e7eb',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'background 0.15s',
                    }}>
                      <i className={`bi ${meta.icon}`} style={{ fontSize:14, color:'white' }}></i>
                    </div>
                    <span style={{
                      fontWeight: isChecked ? 700 : 500,
                      fontSize:'0.85rem',
                      color: isChecked ? meta.color : '#6b7280',
                      flex:1, textAlign:'left',
                    }}>{service}</span>
                    <div style={{
                      width:20, height:20, borderRadius:'50%', flexShrink:0,
                      background: isChecked ? meta.color : '#e5e7eb',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all 0.15s',
                    }}>
                      {isChecked && <i className="bi bi-check-lg" style={{ fontSize:10, color:'white' }}></i>}
                    </div>
                  </button>
                );
              })}
            </div>

            {coveredServices.length > 0 && (
              <div style={{ marginTop:12, fontSize:'0.72rem', color:'#7c3aed', display:'flex', alignItems:'center', gap:5 }}>
                <i className="bi bi-check-circle-fill"></i>
                {coveredServices.length} service{coveredServices.length !== 1 ? 's' : ''} selected: {coveredServices.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
              </div>
            )}
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
          padding:'14px 26px 20px', background:'white',
          borderTop:'1px solid #f3f0ff', borderRadius:'0 0 12px 12px',
        }}>
          <button type="button" onClick={onHide} disabled={loading} style={{
            padding:'9px 20px', borderRadius:10,
            border:'1.5px solid #e5e7eb', background:'white',
            color:'#6b7280', fontWeight:600, fontSize:'0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>Cancel</button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding:'9px 22px', borderRadius:10, border:'none',
              background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: loading ? '#9ca3af' : 'white',
              fontWeight:700, fontSize:'0.85rem', cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', gap:7,
              boxShadow: !loading ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
              transition:'all 0.15s',
            }}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} />Creating...</>
            ) : (
              <><i className="bi bi-check2-circle"></i>Create Policy</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
