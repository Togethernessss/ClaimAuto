// src/pages/shared/Claims/components/SubmitClaimModal.jsx
// Hospital submits a new claim with claim lines.
// Production design: selecting a member enrollment auto-determines the policy.
// One member can have multiple enrollments (one per policy) — each is a separate MemberID.
import { useState, useEffect, useRef } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import {
  HOSPITAL_CLAIM_TYPES, CLAIM_PRIORITIES, formatCurrency,
  DOC_TYPES, computeSHA256,
} from '../utils/claimHelpers';
import { uploadFile } from '../../../../services/files/fileService';
import { lookupMemberEnrollmentsByNumber } from '../../../../services/members/memberService';

const EMPTY_LINE = {
  serviceCode:   '',
  serviceDate:   '',
  quantity:      1,
  unitPrice:     '',
  diagnosisCode: '',
  procedureCode: '',
};

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '8px 11px',
  border: '1.5px solid #e5e7eb', borderRadius: 9,
  fontSize: '0.83rem', color: '#1e1b4b',
  background: '#f9fafb', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, background 0.15s',
};

const inpSm = { ...inp, padding: '6px 9px', fontSize: '0.78rem', borderRadius: 7 };

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, badge, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 11, color: 'white' }}></i>
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.83rem', color: '#1e1b4b' }}>{title}</span>
        {badge != null && badge > 0 && (
          <span style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white', fontSize: '0.65rem', fontWeight: 700,
            borderRadius: 20, padding: '1px 7px', minWidth: 20, textAlign: 'center',
          }}>{badge}</span>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function FL({ label, required, sub }) {
  return (
    <label style={{
      display: 'block', fontSize: '0.72rem', fontWeight: 700,
      color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
    }}>
      {label}
      {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      {sub && <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0, marginLeft: 5 }}>{sub}</span>}
    </label>
  );
}

export default function SubmitClaimModal({
  show,
  loading,
  error,
  members,
  userID,
  onHide,
  onSubmit,
}) {
  const [form, setForm] = useState({
    externalClaimRef: '',
    memberID:         '',
    policyID:         '',
    claimType:        '',
    priority:         'Normal',
    notes:            '',
  });

  const [lines,        setLines]        = useState([]);
  const [lineForm,     setLineForm]     = useState(EMPTY_LINE);
  const [lineError,    setLineError]    = useState(null);
  const [showLineForm, setShowLineForm] = useState(false);

  const [lookupQuery,   setLookupQuery]   = useState('');
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupOptions, setLookupOptions] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState(null);

  const [editLineIdx, setEditLineIdx] = useState(null);

  const [docs,           setDocs]           = useState([]);
  const [docType,        setDocType]        = useState('Invoice');
  const [docFileName,    setDocFileName]    = useState('');
  const [docError,       setDocError]       = useState(null);
  const [showDocForm,    setShowDocForm]    = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const docFileRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (show) {
      setForm({ externalClaimRef:'', memberID:'', policyID:'', claimType:'', priority:'Normal', notes:'' });
      setLines([]); setLineForm(EMPTY_LINE); setLineError(null); setShowLineForm(false);
      setLookupQuery(''); setLookupResult(null); setLookupOptions([]);
      setLookupLoading(false); setLookupError(null); setEditLineIdx(null);
      setDocs([]); setDocType('Invoice'); setDocFileName('');
      setDocError(null); setShowDocForm(false); setUploadingFiles(false);
      if (docFileRef.current) docFileRef.current.value = '';
    }
  }, [show]);

  const totalBilled = lines.reduce((s, l) => s + l.lineBilledAmount, 0);
  const handleField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const applyLookupEnrollment = (member) => {
    setLookupResult(member);
    setForm((prev) => ({ ...prev, memberID: String(member.memberID), policyID: String(member.policyID), claimType: '' }));
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true); setLookupError(null);
    setLookupResult(null); setLookupOptions([]);
    setForm((prev) => ({ ...prev, memberID: '', policyID: '', claimType: '' }));
    try {
      const enrollments = await lookupMemberEnrollmentsByNumber(lookupQuery.trim());

      // ── Step 1: keep only Active enrollments ─────────────────────────────
      const activeEnrollments = enrollments.filter((m) => m.status === 'Active');

      // ── Step 2: exclude enrollments whose coverage hasn't started yet ─────
      // A future coverageStart means services rendered today would fail the
      // "service date before coverage start" validation — block those upfront
      // so they never appear in the selector or get auto-selected.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);   // compare against start-of-day

      const eligibleEnrollments = activeEnrollments.filter((m) => {
        if (!m.coverageStart) return true;                    // no start date → don't block
        const cs = new Date(m.coverageStart);
        cs.setHours(0, 0, 0, 0);
        return cs <= todayStart;                              // only include if started today or earlier
      });

      // ── Step 3: surface the right error / result ──────────────────────────
      if (eligibleEnrollments.length === 0) {
        if (activeEnrollments.length > 0) {
          // Member exists and has Active enrollments — but all have future start dates
          setLookupError(
            'Member found, but their policy coverage has not yet started. ' +
            'Claims can only be submitted under policies whose coverage is currently active.'
          );
        } else {
          // No Active enrollments at all
          setLookupError('Member found, but no active policy enrollment is available for claim submission.');
        }
      } else if (eligibleEnrollments.length === 1) {
        applyLookupEnrollment(eligibleEnrollments[0]);
      } else {
        setLookupOptions(eligibleEnrollments);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Member not found.';
      setLookupError(typeof msg === 'string' ? msg : 'Member not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLineField    = (field) => (e) => setLineForm({ ...lineForm, [field]: e.target.value });
  const handleCodeField    = (field) => (e) => setLineForm({ ...lineForm, [field]: e.target.value.toUpperCase().replace(/\s/g, '') });
  const handleLineQtyOrPrice = (field) => (e) => {
    const updated = { ...lineForm, [field]: e.target.value };
    updated.lineBilledAmount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
    setLineForm(updated);
  };

  const saveLine = () => {
    setLineError(null);
    const serviceCodeClean = lineForm.serviceCode.trim().toUpperCase();
    const diagCodeClean    = lineForm.diagnosisCode.trim().toUpperCase();
    const procCodeClean    = lineForm.procedureCode.trim().toUpperCase();

    if (!serviceCodeClean) { setLineError('Service code is required.'); return; }
    if (!/^[A-Z0-9][A-Z0-9\-\.]{0,19}$/.test(serviceCodeClean)) { setLineError('Service code must be alphanumeric — e.g. 99223, A0427, HCPC-001.'); return; }
    if (!lineForm.serviceDate) { setLineError('Service date is required.'); return; }
    if (new Date(lineForm.serviceDate) > new Date()) { setLineError('Service date cannot be in the future.'); return; }
    if (lookupResult) {
      const sd = new Date(lineForm.serviceDate);
      const cs = new Date(lookupResult.coverageStart);
      if (sd < cs) { setLineError(`Service date cannot be before the member's coverage start (${cs.toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'2-digit' })}).`); return; }
      if (lookupResult.coverageEnd) {
        const ce = new Date(lookupResult.coverageEnd);
        if (sd > ce) { setLineError(`Service date cannot be after the member's coverage end (${ce.toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'2-digit' })}).`); return; }
      }
    }
    if (editLineIdx === null) {
      const isDuplicate = lines.some((l) => l.serviceCode === serviceCodeClean && l.serviceDate === lineForm.serviceDate);
      if (isDuplicate) { setLineError('A line with this service code and date already exists on this claim.'); return; }
    }
    if (Number(lineForm.quantity) < 1 || !Number.isInteger(Number(lineForm.quantity))) { setLineError('Quantity must be a whole number of at least 1.'); return; }
    if (!lineForm.unitPrice || Number(lineForm.unitPrice) <= 0) { setLineError('Unit price must be greater than 0.'); return; }
    if (diagCodeClean && !/^[A-Z]\d{2}[\w\.]{0,5}$/.test(diagCodeClean)) { setLineError('Diagnosis code must be a valid ICD-10 code — e.g. J18.9, M79.3, I10.'); return; }
    if (procCodeClean && !/^[A-Z0-9][A-Z0-9\-\.]{0,19}$/.test(procCodeClean)) { setLineError('Procedure code must be alphanumeric — e.g. 27447, G0104.'); return; }

    const qty = Number(lineForm.quantity) || 1;
    const price = Number(lineForm.unitPrice) || 0;
    const lineData = {
      serviceCode:        serviceCodeClean,
      serviceDate:        lineForm.serviceDate,
      quantity:           qty,
      unitPrice:          price,
      lineBilledAmount:   qty * price,
      diagnosisCodesJSON: diagCodeClean ? JSON.stringify([diagCodeClean]) : null,
      procedureCodesJSON: procCodeClean ? JSON.stringify([procCodeClean]) : null,
    };

    if (editLineIdx !== null) {
      const updated = [...lines]; updated[editLineIdx] = lineData; setLines(updated); setEditLineIdx(null);
    } else {
      setLines([...lines, lineData]);
    }
    setLineForm(EMPTY_LINE); setShowLineForm(false);
  };

  const startEditLine = (idx) => {
    const line = lines[idx];
    let diagCode = ''; let procCode = '';
    try { diagCode = line.diagnosisCodesJSON ? JSON.parse(line.diagnosisCodesJSON)[0] || '' : ''; } catch {}
    try { procCode = line.procedureCodesJSON ? JSON.parse(line.procedureCodesJSON)[0] || '' : ''; } catch {}
    setLineForm({ serviceCode: line.serviceCode, serviceDate: line.serviceDate, quantity: String(line.quantity), unitPrice: String(line.unitPrice), diagnosisCode: diagCode, procedureCode: procCode });
    setEditLineIdx(idx); setShowLineForm(true); setLineError(null);
  };

  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const addDoc = () => {
    const file = docFileRef.current?.files?.[0];
    if (!file) { setDocError('Please select a file.'); return; }
    setDocs([...docs, { docType, file, fileName: file.name }]);
    setDocType('Invoice'); setDocFileName(''); setDocError(null); setShowDocForm(false);
    if (docFileRef.current) docFileRef.current.value = '';
  };

  const removeDoc = (idx) => setDocs(docs.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberID) { setLookupError('Please find a patient first by entering their member number above.'); return; }
    setUploadingFiles(true);
    let processedDocs = [];
    try {
      processedDocs = await Promise.all(
        docs.map(async (d) => {
          const { fileUrl } = await uploadFile(d.file);
          const sha256 = await computeSHA256(d.file);
          return { docType: d.docType, fileURI: fileUrl, sha256 };
        })
      );
    } finally { setUploadingFiles(false); }
    onSubmit(
      {
        externalClaimRef:  form.externalClaimRef || null,
        providerID:        userID,
        memberID:          Number(form.memberID),
        policyID:          Number(form.policyID),
        claimType:         form.claimType,
        totalBilledAmount: totalBilled,
        currency:          'INR',
        priority:          form.priority,
        sourceChannel:     'Portal',
        notes:             form.notes || null,
      },
      lines,
      processedDocs,
    );
  };

  const selectedEnrollment = lookupResult;
  const coveredClaimTypes = (() => {
    if (!lookupResult?.coverageRulesJSON) return HOSPITAL_CLAIM_TYPES;
    try {
      const rules = JSON.parse(lookupResult.coverageRulesJSON);
      const covered = (rules.coveredServices || []).map(s => s.toLowerCase());
      const filtered = HOSPITAL_CLAIM_TYPES.filter(t => covered.includes(t.toLowerCase()));
      return filtered.length > 0 ? filtered : HOSPITAL_CLAIM_TYPES;
    } catch { return HOSPITAL_CLAIM_TYPES; }
  })();

  const isDuplicateRef = !!error && (
    error.toLowerCase().includes('externalclaimref') ||
    error.toLowerCase().includes('external claim ref') ||
    error.toLowerCase().includes('external reference') ||
    error.toLowerCase().includes('already exists')
  );

  const canSubmit = !loading && !uploadingFiles && lines.length > 0 && form.memberID && form.policyID && form.claimType;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">

      {/* ── Gradient Header ──────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 26px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-60, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-30, left:80, pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:13,
              background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <i className="bi bi-file-plus-fill" style={{ fontSize:'1.35rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>Submit New Claim</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>Submit a hospital claim for adjudication</div>
            </div>
          </div>
          <button onClick={onHide} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:16,
          }}>✕</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── API Error banner ─────────────────────────────────────── */}
        {error && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10,
            background:'#fff5f5', border:'0 solid transparent',
            borderBottom:'1px solid #fca5a5',
            padding:'12px 26px',
          }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:15, marginTop:1, flexShrink:0 }}></i>
            <div>
              <div style={{ fontWeight:700, color:'#dc2626', fontSize:'0.83rem' }}>Submission Failed</div>
              <div style={{ color:'#dc2626', fontSize:'0.8rem', marginTop:1 }}>{error}</div>
            </div>
          </div>
        )}

        <div style={{ overflowY:'auto', maxHeight:'65vh', padding:'18px 26px 0' }}>

          {/* ══════════════════════════════════════════════════════
              SECTION 1 — Patient Lookup
          ══════════════════════════════════════════════════════ */}
          <div style={{
            background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border:'1px solid #ddd6fe', borderRadius:12,
            padding:'14px 16px', marginBottom:16,
          }}>
            <SectionHeader icon="bi-person-search" title="Patient Lookup" />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Member Number */}
              <div>
                <FL label="Member Number" required />
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    placeholder="e.g. MEM-000042"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                    style={{ ...inp, flex:1 }}
                    onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                    onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                  />
                  <button type="button" onClick={handleLookup} disabled={lookupLoading || !lookupQuery.trim()} style={{
                    padding:'8px 14px', borderRadius:9, border:'none', flexShrink:0,
                    background: lookupLoading || !lookupQuery.trim()
                      ? '#e5e7eb'
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: lookupLoading || !lookupQuery.trim() ? '#9ca3af' : 'white',
                    fontWeight:700, fontSize:'0.78rem', cursor: lookupLoading || !lookupQuery.trim() ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
                  }}>
                    {lookupLoading
                      ? <><Spinner animation="border" size="sm" style={{ width:12, height:12 }} />Finding…</>
                      : <><i className="bi bi-search"></i>Find Patient</>
                    }
                  </button>
                </div>
                <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:4 }}>
                  Enter the member number from the patient's insurance card, then click Find.
                </div>
                {lookupError && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fff5f5', border:'1px solid #fca5a5', borderRadius:8, padding:'7px 10px', marginTop:8 }}>
                    <i className="bi bi-exclamation-circle-fill" style={{ color:'#dc2626', fontSize:12 }}></i>
                    <span style={{ color:'#dc2626', fontSize:'0.78rem' }}>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* External Claim Ref */}
              <div>
                <FL label="External Claim Ref"
                  sub={isDuplicateRef ? '← already used' : undefined} />
                <input
                  placeholder="e.g. HOSP-2026-00142"
                  value={form.externalClaimRef}
                  onChange={handleField('externalClaimRef')}
                  style={{
                    ...inp,
                    borderColor: isDuplicateRef ? '#ef4444' : '#e5e7eb',
                    background:  isDuplicateRef ? '#fff5f5' : '#f9fafb',
                  }}
                  onFocus={(e) => { if (!isDuplicateRef) { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; } }}
                  onBlur={(e)  => { if (!isDuplicateRef) { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; } }}
                />
                {isDuplicateRef
                  ? <div style={{ fontSize:'0.7rem', color:'#dc2626', marginTop:4 }}><i className="bi bi-exclamation-circle me-1"></i>This reference is already used. Enter a different one.</div>
                  : <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:4 }}>Your billing system reference. Leave blank if none. Must be unique.</div>
                }
              </div>
            </div>

            {/* ── Multi-enrollment result card ─────────────────────────────────
                 Shown when patient has 2+ currently-active policy enrollments.
                 Deliberately styled like a RESULT card (blue, with icon + header)
                 so users know the search succeeded and they need to pick a policy.
            ────────────────────────────────────────────────────────────────── */}
            {lookupOptions.length > 0 && !lookupResult && (
              <div style={{
                marginTop: 12,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1.5px solid #93c5fd',
                borderRadius: 10,
                padding: '12px 14px',
              }}>

                {/* "Patient found" header — mirrors the green single-match card */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%', flexShrink:0,
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <i className="bi bi-person-check-fill" style={{ color:'white', fontSize:15 }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'#1d4ed8', fontSize:'0.88rem' }}>
                      Patient found — {lookupOptions.length} active {lookupOptions.length === 1 ? 'policy' : 'policies'}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'#3b82f6' }}>
                      Select which policy covers this treatment to continue
                    </div>
                  </div>
                </div>

                <FL label="Policy Enrollment for this Claim" required />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const sel = lookupOptions.find((m) => String(m.memberID) === e.target.value);
                    if (sel) applyLookupEnrollment(sel);
                  }}
                  style={{
                    ...inp,
                    borderColor: '#93c5fd',
                    background: 'white',
                    appearance:'none',
                    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%233b82f6' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                    backgroundRepeat:'no-repeat',
                    backgroundPosition:'calc(100% - 12px) 50%',
                    paddingRight:32,
                  }}
                >
                  <option value="">— Choose a policy —</option>
                  {lookupOptions.map((m) => {
                    const start = m.coverageStart
                      ? new Date(m.coverageStart).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                      : '—';
                    const end = m.coverageEnd
                      ? new Date(m.coverageEnd).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                      : 'Open-ended';
                    return (
                      <option key={m.memberID} value={String(m.memberID)}>
                        {m.policyName}  ·  covers {start} → {end}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize:'0.7rem', color:'#1d4ed8', marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="bi bi-info-circle"></i>
                  Each policy is a separate enrollment. Pick the one that applies to this treatment.
                </div>
              </div>
            )}

            {/* Patient found card */}
            {lookupResult && (
              <div style={{
                display:'flex', alignItems:'center', gap:12,
                background:'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border:'1.5px solid #86efac', borderRadius:10, padding:'11px 14px', marginTop:12,
              }}>
                <div style={{
                  width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg, #22c55e, #16a34a)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className="bi bi-person-check-fill" style={{ color:'white', fontSize:16 }}></i>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'#15803d', fontSize:'0.88rem' }}>{lookupResult.name}</div>
                  <div style={{ fontSize:'0.72rem', color:'#16a34a' }}>
                    <span style={{ fontFamily:'monospace', background:'#bbf7d0', padding:'1px 6px', borderRadius:4 }}>{lookupResult.memberNumber}</span>
                    <span style={{ marginLeft:8 }}>· {lookupResult.policyName}</span>
                  </div>
                </div>
                <button type="button" onClick={() => { setLookupResult(null); setLookupQuery(''); setForm(f => ({ ...f, memberID:'', policyID:'', claimType:'' })); }} style={{ marginLeft:'auto', background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:14, padding:0 }}>✕</button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 2 — Claim Details
          ══════════════════════════════════════════════════════ */}
          <div style={{ background:'white', border:'1.5px solid #f3f0ff', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
            <SectionHeader icon="bi-file-medical" title="Claim Details" />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

              {/* Policy — auto-filled */}
              <div>
                <FL label="Policy" sub="Auto-filled" />
                <div style={{
                  ...inp,
                  background: selectedEnrollment ? '#f0f4ff' : '#f8f9fa',
                  color:      selectedEnrollment ? '#1d4ed8' : '#9ca3af',
                  fontWeight: selectedEnrollment ? 600 : 400,
                  cursor: 'not-allowed',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  {selectedEnrollment
                    ? <><i className="bi bi-shield-fill-check" style={{ fontSize:12 }}></i>{selectedEnrollment.policyName}</>
                    : '— Find patient first —'}
                </div>
              </div>

              {/* Claim Type */}
              <div>
                <FL label="Claim Type" required />
                <select value={form.claimType} onChange={handleField('claimType')} required
                  style={{ ...inp, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'calc(100% - 12px) 50%', paddingRight:32 }}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }}
                  onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                >
                  <option value="">— Select type —</option>
                  {coveredClaimTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <FL label="Priority" />
                <select value={form.priority} onChange={handleField('priority')}
                  style={{ ...inp, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'calc(100% - 12px) 50%', paddingRight:32 }}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }}
                  onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                >
                  {CLAIM_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Clinical Notes */}
              <div style={{ gridColumn:'1 / -1' }}>
                <FL label="Clinical Notes" />
                <input
                  placeholder="Optional clinical notes, diagnosis summary, or remarks..."
                  value={form.notes} onChange={handleField('notes')}
                  style={inp}
                  onFocus={(e) => { e.target.style.borderColor='#a78bfa'; e.target.style.background='#faf5ff'; }}
                  onBlur={(e)  => { e.target.style.borderColor='#e5e7eb'; e.target.style.background='#f9fafb'; }}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 3 — Service Lines
          ══════════════════════════════════════════════════════ */}
          <div style={{ background:'white', border:'1.5px solid #f3f0ff', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
            <SectionHeader
              icon="bi-list-ul"
              title="Service Lines"
              badge={lines.length}
              action={
                <button type="button"
                  onClick={() => { setShowLineForm(!showLineForm); setLineError(null); setEditLineIdx(null); setLineForm(EMPTY_LINE); }}
                  style={{
                    padding:'6px 14px', borderRadius:8, border:'none',
                    background: showLineForm ? '#f3f0ff' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: showLineForm ? '#7c3aed' : 'white',
                    fontWeight:700, fontSize:'0.75rem', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                  }}
                >
                  <i className={`bi ${showLineForm ? 'bi-x' : 'bi-plus-lg'}`}></i>
                  {showLineForm ? 'Cancel' : '+ Create Line'}
                </button>
              }
            />

            {/* Line form */}
            {showLineForm && (
              <div style={{ background:'#faf9ff', border:'1.5px solid #ede9fe', borderRadius:10, padding:'14px', marginBottom:12 }}>
                {lineError && (
                  <div style={{
                    display:'flex', alignItems:'center', gap:8,
                    background:'#fff5f5', border:'1px solid #fca5a5',
                    borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:'0.78rem', color:'#dc2626',
                  }}>
                    <i className="bi bi-exclamation-triangle-fill"></i>{lineError}
                  </div>
                )}

                {/* Row 1: Code, Date, Qty, Price, Total */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 2fr 1.5fr', gap:10, marginBottom:10 }}>
                  <div>
                    <FL label="Service Code" required />
                    <input size="sm" placeholder="e.g. 99223" value={lineForm.serviceCode}
                      onChange={handleCodeField('serviceCode')} title="CPT or HCPCS code"
                      style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                  <div>
                    <FL label="Service Date" required />
                    <input type="date" value={lineForm.serviceDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={handleLineField('serviceDate')} style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                  <div>
                    <FL label="Qty" />
                    <input type="number" min="1" value={lineForm.quantity}
                      onChange={handleLineQtyOrPrice('quantity')} style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                  <div>
                    <FL label="Unit Price (₹)" />
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={lineForm.unitPrice}
                      onChange={handleLineQtyOrPrice('unitPrice')} style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                  <div>
                    <FL label="Total" />
                    <div style={{ ...inpSm, background:'#f0f4ff', color:'#1d4ed8', fontWeight:700, cursor:'not-allowed', display:'flex', alignItems:'center' }}>
                      {formatCurrency((Number(lineForm.quantity)||0) * (Number(lineForm.unitPrice)||0))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Diagnosis + Procedure */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <FL label="Diagnosis Code" sub="(ICD-10)" />
                    <input placeholder="e.g. J18.9" value={lineForm.diagnosisCode}
                      onChange={handleCodeField('diagnosisCode')} title="ICD-10 code" style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                  <div>
                    <FL label="Procedure Code" sub="(CPT)" />
                    <input placeholder="e.g. 27447" value={lineForm.procedureCode}
                      onChange={handleCodeField('procedureCode')} title="CPT procedure code" style={inpSm}
                      onFocus={(e) => { e.target.style.borderColor='#a78bfa'; }} onBlur={(e) => { e.target.style.borderColor='#e5e7eb'; }}
                    />
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button type="button" onClick={() => { setShowLineForm(false); setLineError(null); setEditLineIdx(null); setLineForm(EMPTY_LINE); }} style={{
                    padding:'6px 14px', borderRadius:8, border:'1.5px solid #e5e7eb',
                    background:'white', color:'#6b7280', fontWeight:600, fontSize:'0.78rem', cursor:'pointer',
                  }}>Cancel</button>
                  <button type="button" onClick={saveLine} style={{
                    padding:'6px 16px', borderRadius:8, border:'none',
                    background:'linear-gradient(135deg, #667eea, #764ba2)',
                    color:'white', fontWeight:700, fontSize:'0.78rem', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                    boxShadow:'0 3px 8px rgba(102,126,234,0.3)',
                  }}>
                    {editLineIdx !== null
                      ? <><i className="bi bi-check2"></i>Update Line</>
                      : <><i className="bi bi-plus-lg"></i>Create Line</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Lines table */}
            {lines.length > 0 && (
              <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #ede9fe' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 60px 1fr 1fr 60px', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding:'8px 14px' }}>
                  {['Code','Date','Qty','Unit ₹','Total ₹',''].map((h, i) => (
                    <div key={i} style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {lines.map((line, idx) => (
                  <div key={idx} style={{
                    display:'grid', gridTemplateColumns:'1.5fr 1fr 60px 1fr 1fr 60px',
                    padding:'9px 14px', alignItems:'center',
                    borderBottom: idx < lines.length-1 ? '1px solid #f3f0ff' : 'none',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background='#faf9ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; }}
                  >
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'#4c1d95', fontSize:'0.82rem' }}>{line.serviceCode}</span>
                    <span style={{ fontSize:'0.8rem', color:'#374151' }}>
                      {new Date(line.serviceDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </span>
                    <span style={{ fontSize:'0.8rem', color:'#374151' }}>{line.quantity}</span>
                    <span style={{ fontSize:'0.8rem', color:'#374151' }}>{formatCurrency(line.unitPrice)}</span>
                    <span style={{ fontWeight:700, color:'#1d4ed8', fontSize:'0.82rem' }}>{formatCurrency(line.lineBilledAmount)}</span>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button type="button" onClick={() => startEditLine(idx)} title="Edit" style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:2, fontSize:13 }}>
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button type="button" onClick={() => removeLine(idx)} title="Remove" style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:2, fontSize:13 }}>
                        <i className="bi bi-trash3-fill"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {/* Total row */}
                <div style={{
                  display:'grid', gridTemplateColumns:'1.5fr 1fr 60px 1fr 1fr 60px',
                  padding:'9px 14px', background:'#f0f4ff', borderTop:'2px solid #c7d7f9',
                }}>
                  <div style={{ gridColumn:'1 / 5', textAlign:'right', fontSize:'0.8rem', fontWeight:700, color:'#374151', paddingRight:8 }}>Total Billed:</div>
                  <div style={{ fontWeight:800, color:'#1d4ed8', fontSize:'0.88rem' }}>{formatCurrency(totalBilled)}</div>
                  <div></div>
                </div>
              </div>
            )}

            {lines.length === 0 && !showLineForm && (
              <div style={{ textAlign:'center', padding:'20px', borderRadius:10, background:'#f9fafb', border:'1.5px dashed #e5e7eb', color:'#9ca3af', fontSize:'0.82rem' }}>
                <i className="bi bi-list-ul" style={{ fontSize:24, display:'block', marginBottom:6 }}></i>
                No service lines yet. Click <strong>+ Create Line</strong> to add.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 4 — Supporting Documents
          ══════════════════════════════════════════════════════ */}
          <div style={{ background:'white', border:'1.5px solid #f3f0ff', borderRadius:12, padding:'14px 16px', marginBottom:4 }}>
            <SectionHeader
              icon="bi-paperclip"
              title="Supporting Documents"
              badge={docs.length}
              action={
                <button type="button"
                  onClick={() => { setShowDocForm(!showDocForm); setDocError(null); }}
                  style={{
                    padding:'6px 14px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'0.75rem',
                    border: showDocForm ? '1.5px solid #e5e7eb' : '1.5px solid #a78bfa',
                    background: showDocForm ? 'white' : '#f5f3ff',
                    color: showDocForm ? '#6b7280' : '#7c3aed',
                    display:'flex', alignItems:'center', gap:5,
                  }}
                >
                  <i className={`bi ${showDocForm ? 'bi-x' : 'bi-upload'}`}></i>
                  {showDocForm ? 'Cancel' : 'Attach File'}
                </button>
              }
            />

            {/* Doc attach form */}
            {showDocForm && (
              <div style={{ background:'#faf9ff', border:'1.5px solid #ede9fe', borderRadius:10, padding:'14px', marginBottom:12 }}>
                {docError && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff5f5', border:'1px solid #fca5a5', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:'0.78rem', color:'#dc2626' }}>
                    <i className="bi bi-exclamation-triangle-fill"></i>{docError}
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:10, alignItems:'flex-end' }}>
                  <div>
                    <FL label="Document Type" />
                    <select value={docType} onChange={(e) => setDocType(e.target.value)}
                      style={{ ...inpSm, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'calc(100% - 10px) 50%', paddingRight:28 }}
                    >
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <FL label="File" />
                    <input ref={docFileRef} type="file"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => setDocFileName(e.target.files?.[0]?.name || '')}
                    />
                  </div>
                  <button type="button" onClick={addDoc} disabled={!docFileName} style={{
                    padding:'6px 14px', borderRadius:8, border:'none',
                    background: !docFileName ? '#e5e7eb' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: !docFileName ? '#9ca3af' : 'white',
                    fontWeight:700, fontSize:'0.78rem', cursor: !docFileName ? 'not-allowed' : 'pointer',
                    whiteSpace:'nowrap',
                  }}>Add</button>
                </div>
              </div>
            )}

            {/* Doc list */}
            {docs.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {docs.map((d, idx) => (
                  <div key={idx} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    background:'#f0f4ff', border:'1px solid #c7d7f9',
                    borderRadius:8, padding:'8px 12px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <i className="bi bi-file-earmark-text" style={{ color:'#3b82f6', fontSize:16 }}></i>
                      <span style={{ fontWeight:600, fontSize:'0.82rem', color:'#1e1b4b' }}>{d.fileName}</span>
                      <span style={{ fontSize:'0.68rem', background:'white', border:'1px solid #e5e7eb', color:'#6b7280', padding:'1px 8px', borderRadius:20 }}>{d.docType}</span>
                    </div>
                    <button type="button" onClick={() => removeDoc(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:14, padding:0 }}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {docs.length === 0 && !showDocForm && (
              <div style={{ textAlign:'center', padding:'16px', borderRadius:10, background:'#f9fafb', border:'1.5px dashed #e5e7eb', color:'#9ca3af', fontSize:'0.82rem' }}>
                <i className="bi bi-paperclip me-1"></i>Optional — attach invoices, lab reports, or prescriptions.
              </div>
            )}
          </div>

          <div style={{ height:16 }} />
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'13px 26px 18px', borderTop:'1px solid #f3f0ff',
          background:'white', borderRadius:'0 0 12px 12px',
        }}>
          <div style={{ fontSize:'0.82rem', color:'#6b7280' }}>
            {lines.length > 0 && (
              <><span style={{ fontWeight:700, color:'#1e1b4b' }}>{lines.length}</span> line{lines.length!==1?'s':''} · <span style={{ fontWeight:700, color:'#1d4ed8' }}>{formatCurrency(totalBilled)}</span> total</>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onHide} disabled={loading} style={{
              padding:'9px 20px', borderRadius:10,
              border:'1.5px solid #e5e7eb', background:'white',
              color:'#6b7280', fontWeight:600, fontSize:'0.85rem', cursor:'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={!canSubmit} style={{
              padding:'9px 22px', borderRadius:10, border:'none',
              background: canSubmit ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: canSubmit ? 'white' : '#9ca3af',
              fontWeight:700, fontSize:'0.85rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', gap:7,
              boxShadow: canSubmit ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
              transition:'all 0.15s',
            }}>
              {uploadingFiles ? (
                <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} />Uploading files…</>
              ) : loading ? (
                <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} />Submitting…</>
              ) : (
                <><i className="bi bi-send-fill"></i>Submit Claim</>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
