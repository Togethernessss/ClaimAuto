// src/pages/Admin/Rules/components/RuleFormModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Friendly form-based rule editor. No more raw JSON for built-in templates.
//
// For each rule template, the form renders typed inputs (number, currency,
// multi-select, etc.) based on a per-template schema. Behind the scenes the
// component still serializes to the exact same JSON shape the backend expects
// — so no API or strategy change is needed.
//
// Edit mode parses existing JSON back into form fields. If parsing fails
// (very old / malformed rule) the user is shown the raw JSON for safe edit.
//
// Power-user "Show advanced JSON" toggle reveals the raw JSON at the bottom,
// kept in sync with the form fields (two-way binding via the source-of-truth
// string in `form.conditionExpressionJSON` / `form.actionExpressionJSON`).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, Badge, InputGroup } from 'react-bootstrap';

// ── BUILT-IN RULE TEMPLATES ───────────────────────────────────────────────────
const RULE_TEMPLATES = [
  { id: 'policy-active',            name: 'Policy Active Check',
    description: 'Denies the claim if the member\'s policy is not currently Active.',
    ruleType: 'PolicyActive', icon: 'bi-shield-check', color: '#085041', bg: '#d1f2eb' },
  { id: 'in-network',               name: 'In-Network Check',
    description: 'Rejects out-of-network providers.',
    ruleType: 'InNetwork', icon: 'bi-hospital', color: '#0C447C', bg: '#e3f2fd' },
  { id: 'waiting-period',           name: 'Waiting Period',
    description: 'Rejects claims filed before the policy waiting period has elapsed.',
    ruleType: 'WaitingPeriod', icon: 'bi-hourglass-split', color: '#6c4f00', bg: '#fff8e1' },
  { id: 'coverage-remaining',       name: 'Coverage Remaining Check',
    description: 'Denies if remaining policy coverage is insufficient for the claim.',
    ruleType: 'CoverageRemaining', icon: 'bi-shield-exclamation', color: '#7a1f1f', bg: '#fff1f0' },
  { id: 'amount-below',             name: 'Auto-Approve Below Amount',
    description: 'Auto-approves claims whose total amount is below the configured limit.',
    ruleType: 'AmountBelow', icon: 'bi-check-circle', color: '#1b5e20', bg: '#e8f5e9' },
  { id: 'amount-above',             name: 'Route Above Amount',
    description: 'Routes claims above the configured amount to manual review.',
    ruleType: 'AmountAbove', icon: 'bi-cash-coin', color: '#e65100', bg: '#fff3e0' },
  { id: 'amount-between',           name: 'Amount Between Range',
    description: 'Applies a custom decision when claim amount falls within a configured range.',
    ruleType: 'AmountBetween', icon: 'bi-bar-chart', color: '#0d6efd', bg: '#e7f1ff' },
  { id: 'claim-type-deny',          name: 'Deny by Claim Type',
    description: 'Rejects claims whose ClaimType is in the configured list (e.g., excluded categories).',
    ruleType: 'ClaimTypeDeny', icon: 'bi-x-circle', color: '#b71c1c', bg: '#ffebee' },
  { id: 'claim-type-pass',          name: 'Auto-Pass by Claim Type',
    description: 'Auto-approves claims whose ClaimType is in the configured list.',
    ruleType: 'ClaimTypePass', icon: 'bi-check2-circle', color: '#1b5e20', bg: '#e8f5e9' },
  { id: 'duplicate-detection',      name: 'Duplicate Detection',
    description: 'Denies duplicate claims (same member + provider within N days).',
    ruleType: 'DuplicateCheck', icon: 'bi-files', color: '#6a1b9a', bg: '#f3e5f5' },
  // Reimbursement Duplicate Check template removed — Reimbursement claim type no longer exists.
  { id: 'deductible',               name: 'Deductible Applied',
    description: 'Reduces the payable amount by the policy\'s deductible before approving payment.',
    ruleType: 'Deductible', icon: 'bi-percent', color: '#1b5e20', bg: '#e8f5e9' },
  { id: 'copay',                    name: 'Apply CoPay Percentage',
    description: 'Deducts a configured percentage of the claim amount as co-pay.',
    ruleType: 'CoPay', icon: 'bi-pie-chart', color: '#4527a0', bg: '#ede7f6' },
  { id: 'require-doc-type',         name: 'Require Document Type',
    description: 'Routes claim if required document types are not verified.',
    ruleType: 'RequireDocType', icon: 'bi-file-earmark-check', color: '#00695c', bg: '#e0f2f1' },
  { id: 'route-to-review',          name: 'Always Route to Review',
    description: 'Sends every matching claim to manual review (use sparingly).',
    ruleType: 'RouteToReview', icon: 'bi-arrow-right-circle', color: '#bf360c', bg: '#fbe9e7' },
];

const RULE_TYPES = RULE_TEMPLATES.map(t => t.ruleType);

const CLAIM_TYPES = ['Inpatient', 'Outpatient', 'Pharmacy', 'Emergency'];
const DOC_TYPES = ['Invoice', 'MedicalRecord', 'LabReport', 'Prescription', 'DischargeSummary'];
// AdjDecision values. 'Approved' replaces the old 'Paid' label.
// 'Paid' is kept as a recognized synonym only for hydrating legacy rule JSON.
const DECISIONS = ['Approved', 'Denied', 'PendingReview', 'Continue'];
const LEGACY_DECISION_ALIASES = { Paid: 'Approved' };

// ── PARAMETER SCHEMAS ─────────────────────────────────────────────────────────
// One entry per template's RuleType. Each schema field describes how to render
// the input AND how to validate it. Templates with no params have an empty
// array (no condition inputs — the rule fires unconditionally).
//
// Field shape:
//   { key, label, type, default, required, min, max, maxLength, options, help }
// Types: 'number' | 'currency' | 'percent' | 'multiSelect' | 'text'
const TEMPLATE_PARAM_SCHEMAS = {
  PolicyActive:           [],
  InNetwork:              [],
  CoverageRemaining:      [],
  // ReimbursementDuplicate removed — Reimbursement claim type no longer exists.
  Deductible:             [],
  RouteToReview:          [],

  WaitingPeriod: [
    { key: 'days', label: 'Waiting period (days)', type: 'number',
      default: 30, required: true, min: 1, max: 365,
      help: 'Reject claims filed within this many days of policy start.' },
  ],

  AmountBelow: [
    { key: 'maxAmount', label: 'Maximum claim amount', type: 'currency',
      default: 5000, required: true, min: 1, max: 100000000,
      help: 'Claims with total ≤ this amount will auto-approve.' },
  ],

  AmountAbove: [
    { key: 'minAmount', label: 'Minimum claim amount', type: 'currency',
      default: 500000, required: true, min: 1, max: 100000000,
      help: 'Claims with total ≥ this amount route to manual review.' },
  ],

  AmountBetween: [
    { key: 'minAmount', label: 'Minimum amount', type: 'currency',
      default: 10000, required: true, min: 0, max: 100000000,
      help: 'Lower bound of the range (inclusive).' },
    { key: 'maxAmount', label: 'Maximum amount', type: 'currency',
      default: 100000, required: true, min: 1, max: 100000000,
      help: 'Upper bound of the range (inclusive).' },
  ],

  ClaimTypeDeny: [
    { key: 'types', label: 'Claim types to deny', type: 'multiSelect',
      options: CLAIM_TYPES, default: ['Pharmacy'], required: true,
      help: 'Any claim with one of these types will be denied.' },
  ],

  ClaimTypePass: [
    { key: 'types', label: 'Claim types to auto-approve', type: 'multiSelect',
      options: CLAIM_TYPES, default: ['Outpatient'], required: true,
      help: 'Any claim with one of these types will auto-approve.' },
  ],

  DuplicateCheck: [
    { key: 'windowDays', label: 'Look-back window (days)', type: 'number',
      default: 7, required: true, min: 1, max: 90,
      help: 'Deny if same member + provider submitted a claim in the last N days.' },
  ],

  CoPay: [
    { key: 'percent', label: 'Co-pay percentage', type: 'percent',
      default: 10, required: true, min: 0, max: 100,
      help: 'Percentage of the claim amount the member must pay.' },
  ],

  RequireDocType: [
    { key: 'requiredTypes', label: 'Required document types', type: 'multiSelect',
      options: DOC_TYPES, default: ['DischargeSummary'], required: true,
      help: 'Routes to review if any of these document types is missing or unverified.' },
  ],
};

// Default action per template — what decision/reason to pre-fill.
const TEMPLATE_DEFAULT_ACTIONS = {
  PolicyActive:           { decision: 'Denied',        reason: 'Policy must be Active' },
  InNetwork:              { decision: 'Denied',        reason: 'Provider is not in-network' },
  WaitingPeriod:          { decision: 'Denied',        reason: 'Within policy waiting period' },
  CoverageRemaining:      { decision: 'Denied',        reason: 'Policy coverage exhausted' },
  AmountBelow:            { decision: 'Approved',      reason: 'Auto-approved — under threshold' },
  AmountAbove:            { decision: 'PendingReview', reason: 'High-value claim — manual review required' },
  AmountBetween:          { decision: 'PendingReview', reason: 'Claim in review range' },
  ClaimTypeDeny:          { decision: 'Denied',        reason: 'Claim type not covered' },
  ClaimTypePass:          { decision: 'Approved',      reason: 'Claim type auto-approved' },
  DuplicateCheck:         { decision: 'Denied',        reason: 'Duplicate claim detected' },
  // ReimbursementDuplicate default removed — Reimbursement claim type no longer exists.
  Deductible:             { decision: 'Continue',      reason: 'Deductible applied to payable amount' },
  CoPay:                  { decision: 'Continue',      reason: 'Co-pay applied' },
  RequireDocType:         { decision: 'PendingReview', reason: 'Required documents missing' },
  RouteToReview:          { decision: 'PendingReview', reason: 'Routed to manual review by configuration' },
};

const REASON_MAX_LENGTH = 200;

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Parse a JSON string safely. Returns null on any error.
function safeParse(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

// Build the conditionExpressionJSON from form values + schema.
// Omits keys whose values are empty/null/undefined.
function buildConditionJson(ruleType, paramValues) {
  const schema = TEMPLATE_PARAM_SCHEMAS[ruleType] ?? [];
  if (schema.length === 0) return '{}';
  const out = {};
  for (const field of schema) {
    const v = paramValues[field.key];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[field.key] = v;
  }
  return JSON.stringify(out);
}

// Build the actionExpressionJSON.
function buildActionJson(decision, reason) {
  return JSON.stringify({ decision, reason: reason ?? '' });
}

// Get the default param values from a template's schema.
function defaultParams(ruleType) {
  const schema = TEMPLATE_PARAM_SCHEMAS[ruleType] ?? [];
  const obj = {};
  for (const f of schema) {
    if (f.default !== undefined) obj[f.key] = f.default;
  }
  return obj;
}

// Read existing JSON back into param state.
// Falls back to schema defaults for missing keys.
function hydrateParams(ruleType, conditionJson) {
  const schema = TEMPLATE_PARAM_SCHEMAS[ruleType] ?? [];
  const parsed = safeParse(conditionJson) ?? {};
  const obj = {};
  for (const f of schema) {
    obj[f.key] = parsed[f.key] !== undefined ? parsed[f.key]
               : (f.default !== undefined ? f.default : (f.type === 'multiSelect' ? [] : ''));
  }
  return obj;
}

// Read action JSON back into {decision, reason}.
function hydrateAction(ruleType, actionJson) {
  const parsed = safeParse(actionJson);
  if (parsed && typeof parsed === 'object') {
    // Map legacy aliases ('Paid' → 'Approved') so old rules display correctly.
    const raw = parsed.decision;
    const mapped = LEGACY_DECISION_ALIASES[raw] ?? raw;
    return {
      decision: DECISIONS.includes(mapped) ? mapped
              : (TEMPLATE_DEFAULT_ACTIONS[ruleType]?.decision ?? 'Approved'),
      reason: parsed.reason ?? '',
    };
  }
  return TEMPLATE_DEFAULT_ACTIONS[ruleType] ?? { decision: 'Approved', reason: '' };
}

// Format a number with thousand separators for INR display.
function formatINR(n) {
  if (n === '' || n === null || n === undefined) return '';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('en-IN');
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RuleFormModal({
  show,
  loading,
  error,
  form,
  mode,
  rule,
  onHide,
  onFieldChange,
  onSubmit,
}) {
  const isEdit = mode === 'edit';

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState(null);  // template id
  const [useCustom, setUseCustom] = useState(false);
  const [paramValues, setParamValues] = useState({});              // condition params
  const [actionDecision, setActionDecision] = useState('Approved');
  const [actionReason, setActionReason] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [paramErrors, setParamErrors] = useState({});              // { key: 'error message' }
  const [actionErrors, setActionErrors] = useState({});            // { decision/reason: msg }
  const [rawJsonErrors, setRawJsonErrors] = useState({ condition: null, action: null });
  const [legacyJsonFallback, setLegacyJsonFallback] = useState(false);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;

    setShowAdvanced(false);
    setParamErrors({});
    setActionErrors({});
    setRawJsonErrors({ condition: null, action: null });
    setLegacyJsonFallback(false);

    if (isEdit && rule) {
      // ── EDIT MODE ──
      // RuleType is fixed; hydrate params + action from existing JSON.
      const rt = rule.ruleType;
      const schema = TEMPLATE_PARAM_SCHEMAS[rt];
      if (schema === undefined) {
        // Unknown template (custom or legacy rule) — fall back to raw JSON view.
        setLegacyJsonFallback(true);
        setUseCustom(true);
      } else {
        setUseCustom(false);
        setParamValues(hydrateParams(rt, form.conditionExpressionJSON));
        const a = hydrateAction(rt, form.actionExpressionJSON);
        setActionDecision(a.decision);
        setActionReason(a.reason);
      }
      setSelectedTemplate(null);
    } else {
      // ── CREATE MODE ──
      setSelectedTemplate(null);
      setUseCustom(false);
      setParamValues({});
      setActionDecision('Approved');
      setActionReason('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEdit, rule?.ruleID]);

  // ── Push form-field state up into parent's form whenever it changes ────────
  // Only fires when we have a known template (i.e., not in legacy raw-JSON mode).
  useEffect(() => {
    if (!show) return;
    const rt = isEdit ? rule?.ruleType : form.ruleType;
    if (!rt || TEMPLATE_PARAM_SCHEMAS[rt] === undefined) return;
    if (useCustom && !legacyJsonFallback) return; // custom rule path keeps its own raw JSON

    onFieldChange('conditionExpressionJSON')({
      target: { value: buildConditionJson(rt, paramValues) }
    });
    onFieldChange('actionExpressionJSON')({
      target: { value: buildActionJson(actionDecision, actionReason) }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramValues, actionDecision, actionReason, show]);

  // ── Validate condition params live ─────────────────────────────────────────
  const validateParams = useMemo(() => {
    const rt = isEdit ? rule?.ruleType : form.ruleType;
    const schema = TEMPLATE_PARAM_SCHEMAS[rt];
    if (!schema || schema.length === 0) return {};

    const errs = {};
    for (const f of schema) {
      const v = paramValues[f.key];

      if (f.required) {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          errs[f.key] = `${f.label} is required.`;
          continue;
        }
      }

      if (f.type === 'number' || f.type === 'currency' || f.type === 'percent') {
        if (v === '' || v === null || v === undefined) continue;
        const num = Number(v);
        if (Number.isNaN(num)) {
          errs[f.key] = 'Must be a number.';
        } else if (f.min !== undefined && num < f.min) {
          errs[f.key] = `Must be ≥ ${f.min}.`;
        } else if (f.max !== undefined && num > f.max) {
          errs[f.key] = `Must be ≤ ${f.max}.`;
        }
      }
    }

    // Cross-field: AmountBetween requires min < max
    if (rt === 'AmountBetween') {
      const mn = Number(paramValues.minAmount);
      const mx = Number(paramValues.maxAmount);
      if (!Number.isNaN(mn) && !Number.isNaN(mx) && mn >= mx) {
        errs.maxAmount = 'Maximum must be greater than minimum.';
      }
    }
    return errs;
  }, [paramValues, form.ruleType, rule?.ruleType, isEdit]);

  useEffect(() => { setParamErrors(validateParams); }, [validateParams]);

  // ── Validate action fields live ────────────────────────────────────────────
  useEffect(() => {
    const errs = {};
    if (!DECISIONS.includes(actionDecision)) errs.decision = 'Pick a decision.';
    if (!actionReason || !actionReason.trim()) errs.reason = 'Reason is required.';
    else if (actionReason.length > REASON_MAX_LENGTH)
      errs.reason = `Max ${REASON_MAX_LENGTH} characters.`;
    setActionErrors(errs);
  }, [actionDecision, actionReason]);

  // ── Template selection ─────────────────────────────────────────────────────
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);

    onFieldChange('name')({ target: { value: template.name } });
    onFieldChange('description')({ target: { value: template.description } });
    onFieldChange('ruleType')({ target: { value: template.ruleType } });

    const params = defaultParams(template.ruleType);
    setParamValues(params);

    const a = TEMPLATE_DEFAULT_ACTIONS[template.ruleType] ?? { decision: 'Approved', reason: '' };
    setActionDecision(a.decision);
    setActionReason(a.reason);

    if (!form.priority) {
      const idx = RULE_TEMPLATES.findIndex(t => t.id === template.id);
      onFieldChange('priority')({ target: { value: String(idx + 1) } });
    }
  };

  // ── Raw JSON edit handlers (for advanced view and legacy fallback) ─────────
  const handleRawConditionChange = (e) => {
    const val = e.target.value;
    onFieldChange('conditionExpressionJSON')({ target: { value: val } });
    if (!val.trim()) {
      setRawJsonErrors(p => ({ ...p, condition: null }));
      return;
    }
    try {
      const parsed = JSON.parse(val);
      setRawJsonErrors(p => ({ ...p, condition: null }));
      // Sync back into form fields if we're in a known template (advanced toggle)
      const rt = isEdit ? rule?.ruleType : form.ruleType;
      if (rt && TEMPLATE_PARAM_SCHEMAS[rt] !== undefined && !legacyJsonFallback) {
        const schema = TEMPLATE_PARAM_SCHEMAS[rt];
        const next = { ...paramValues };
        for (const f of schema) {
          if (parsed[f.key] !== undefined) next[f.key] = parsed[f.key];
        }
        setParamValues(next);
      }
    } catch (err) {
      setRawJsonErrors(p => ({ ...p, condition: err.message }));
    }
  };

  const handleRawActionChange = (e) => {
    const val = e.target.value;
    onFieldChange('actionExpressionJSON')({ target: { value: val } });
    if (!val.trim()) {
      setRawJsonErrors(p => ({ ...p, action: null }));
      return;
    }
    try {
      const parsed = JSON.parse(val);
      setRawJsonErrors(p => ({ ...p, action: null }));
      if (parsed.decision && DECISIONS.includes(parsed.decision)) setActionDecision(parsed.decision);
      if (typeof parsed.reason === 'string') setActionReason(parsed.reason);
    } catch (err) {
      setRawJsonErrors(p => ({ ...p, action: err.message }));
    }
  };

  // ── Field setter ───────────────────────────────────────────────────────────
  const setParam = (key, value) => setParamValues(prev => ({ ...prev, [key]: value }));

  const toggleMultiSelect = (key, option) => {
    setParamValues(prev => {
      const cur = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: cur.includes(option) ? cur.filter(x => x !== option) : [...cur, option]
      };
    });
  };

  // ── Submit gating ──────────────────────────────────────────────────────────
  const currentRuleType = isEdit ? rule?.ruleType : form.ruleType;
  const isKnownTemplate = currentRuleType && TEMPLATE_PARAM_SCHEMAS[currentRuleType] !== undefined;

  const hasParamErrors = Object.keys(paramErrors).length > 0;
  const hasActionErrors = Object.keys(actionErrors).length > 0;
  const hasRawJsonErrors = !!rawJsonErrors.condition || !!rawJsonErrors.action;

  // Custom-rule path: must use raw JSON, validate it.
  const submitDisabled = loading
    || (!isEdit && !useCustom && !selectedTemplate)
    || (isKnownTemplate && !legacyJsonFallback && (hasParamErrors || hasActionErrors))
    || hasRawJsonErrors;

  // ── Render: dynamic field for a single schema entry ────────────────────────
  const renderField = (field) => {
    const err = paramErrors[field.key];
    const value = paramValues[field.key];

    if (field.type === 'currency') {
      return (
        <Form.Group key={field.key} className="mb-3">
          <Form.Label className="small fw-semibold">
            {field.label} {field.required && <span className="text-danger">*</span>}
          </Form.Label>
          <InputGroup hasValidation>
            <InputGroup.Text>₹</InputGroup.Text>
            <Form.Control
              type="number"
              min={field.min} max={field.max}
              value={value ?? ''}
              onChange={(e) => setParam(field.key, e.target.value === '' ? '' : Number(e.target.value))}
              isInvalid={!!err}
              required={field.required}
            />
            <Form.Control.Feedback type="invalid">{err}</Form.Control.Feedback>
          </InputGroup>
          {field.help && !err && (
            <Form.Text className="text-muted">{field.help}</Form.Text>
          )}
          {value !== '' && value !== undefined && !err && (
            <div className="small text-muted mt-1">
              <i className="bi bi-info-circle me-1"></i>
              {formatINR(value)} INR
            </div>
          )}
        </Form.Group>
      );
    }

    if (field.type === 'percent') {
      return (
        <Form.Group key={field.key} className="mb-3">
          <Form.Label className="small fw-semibold">
            {field.label} {field.required && <span className="text-danger">*</span>}
          </Form.Label>
          <InputGroup hasValidation>
            <Form.Control
              type="number"
              min={field.min} max={field.max} step="0.1"
              value={value ?? ''}
              onChange={(e) => setParam(field.key, e.target.value === '' ? '' : Number(e.target.value))}
              isInvalid={!!err}
              required={field.required}
            />
            <InputGroup.Text>%</InputGroup.Text>
            <Form.Control.Feedback type="invalid">{err}</Form.Control.Feedback>
          </InputGroup>
          {field.help && !err && (
            <Form.Text className="text-muted">{field.help}</Form.Text>
          )}
        </Form.Group>
      );
    }

    if (field.type === 'number') {
      return (
        <Form.Group key={field.key} className="mb-3">
          <Form.Label className="small fw-semibold">
            {field.label} {field.required && <span className="text-danger">*</span>}
          </Form.Label>
          <Form.Control
            type="number"
            min={field.min} max={field.max}
            value={value ?? ''}
            onChange={(e) => setParam(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            isInvalid={!!err}
            required={field.required}
          />
          <Form.Control.Feedback type="invalid">{err}</Form.Control.Feedback>
          {field.help && !err && (
            <Form.Text className="text-muted">{field.help}</Form.Text>
          )}
        </Form.Group>
      );
    }

    if (field.type === 'multiSelect') {
      const arr = Array.isArray(value) ? value : [];
      return (
        <Form.Group key={field.key} className="mb-3">
          <Form.Label className="small fw-semibold">
            {field.label} {field.required && <span className="text-danger">*</span>}
          </Form.Label>
          <div className="d-flex flex-wrap gap-2 p-2 rounded"
               style={{ background: 'white', border: err ? '1px solid #dc3545' : '1px solid #ced4da' }}>
            {field.options.map((opt) => {
              const checked = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleMultiSelect(field.key, opt)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${checked ? '#0d6efd' : '#dee2e6'}`,
                    background: checked ? '#0d6efd' : 'white',
                    color: checked ? 'white' : '#495057',
                    transition: 'all .15s',
                    cursor: 'pointer',
                  }}
                >
                  <i className={`bi ${checked ? 'bi-check-circle-fill' : 'bi-circle'} me-1`}></i>
                  {opt}
                </button>
              );
            })}
          </div>
          {err && <div className="invalid-feedback d-block">{err}</div>}
          {field.help && !err && (
            <Form.Text className="text-muted">{field.help}</Form.Text>
          )}
        </Form.Group>
      );
    }

    // Fallback: text
    return (
      <Form.Group key={field.key} className="mb-3">
        <Form.Label className="small fw-semibold">{field.label}</Form.Label>
        <Form.Control
          type="text"
          value={value ?? ''}
          onChange={(e) => setParam(field.key, e.target.value)}
          isInvalid={!!err}
          maxLength={field.maxLength}
        />
        <Form.Control.Feedback type="invalid">{err}</Form.Control.Feedback>
      </Form.Group>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const showStep2 = (isEdit) || useCustom || (!isEdit && selectedTemplate);
  const schemaForCurrent = isKnownTemplate ? TEMPLATE_PARAM_SCHEMAS[currentRuleType] : null;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" scrollable>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          {isEdit ? (
            <><i className="bi bi-pencil text-warning me-2"></i>Edit Rule</>
          ) : (
            <><i className="bi bi-plus-circle text-primary me-2"></i>Create New Rule</>
          )}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={onSubmit} noValidate>
        <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

          {isEdit && rule && (
            <Alert variant="info" className="py-2 small mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Rule Type</strong> ({rule.ruleType}) cannot be changed.
              Version will bump automatically on save.
            </Alert>
          )}

          {!isEdit && (
            <Alert variant="warning" className="py-2 small mb-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              New rules start as <strong>Draft</strong>.
              Activate them from the Rules list to use in adjudication.
            </Alert>
          )}

          {legacyJsonFallback && (
            <Alert variant="warning" className="py-2 small mb-3">
              <i className="bi bi-code-slash me-2"></i>
              This rule uses a non-standard template ({rule?.ruleType}). Edit the raw JSON below.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="py-2 d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            </Alert>
          )}

          {/* ── STEP 1: template picker (create only) ─────────────────────── */}
          {!isEdit && !useCustom && (
            <div className="mb-4">
              <div className="fw-semibold small mb-2">
                <StepBadge n={1} /> Select a rule template
              </div>

              <div className="d-flex flex-column gap-2">
                {RULE_TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    style={{
                      padding: '12px 16px', borderRadius: 10,
                      border: selectedTemplate === t.id
                        ? `2px solid ${t.color}` : '2px solid #e9ecef',
                      background: selectedTemplate === t.id ? t.bg : 'white',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTemplate !== t.id)
                        e.currentTarget.style.borderColor = '#dee2e6';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTemplate !== t.id)
                        e.currentTarget.style.borderColor = '#e9ecef';
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: t.bg, border: `1.5px solid ${t.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <i className={t.icon} style={{ color: t.color, fontSize: 16 }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold" style={{ fontSize: 13 }}>{t.name}</span>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4,
                          background: t.bg, color: t.color, fontWeight: 600,
                        }}>
                          {t.ruleType}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        {t.description}
                      </div>
                    </div>
                    {selectedTemplate === t.id && (
                      <i className="bi bi-check-circle-fill"
                        style={{ color: t.color, fontSize: 18, flexShrink: 0 }}
                      ></i>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className="btn btn-link btn-sm p-0 mt-2"
                style={{ fontSize: 12, color: '#6c757d' }}
              >
                <i className="bi bi-code-slash me-1"></i>
                Create custom rule instead
              </button>
            </div>
          )}

          {/* ── STEP 2: configure ─────────────────────────────────────────── */}
          {showStep2 && (
            <>
              {!isEdit && (
                <div className="fw-semibold small mb-3">
                  <StepBadge n={2} /> Configure rule details
                  {useCustom && (
                    <button
                      type="button"
                      onClick={() => { setUseCustom(false); setSelectedTemplate(null); }}
                      className="btn btn-link btn-sm p-0 ms-2"
                      style={{ fontSize: 11, color: '#6c757d' }}
                    >
                      ← Back to templates
                    </button>
                  )}
                </div>
              )}

              <Row className="g-3">
                {/* Rule Name */}
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Rule Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      placeholder="e.g. Auto-Approve Small Claims"
                      value={form.name}
                      onChange={onFieldChange('name')}
                      required
                      maxLength={150}
                    />
                  </Form.Group>
                </Col>

                {/* Priority */}
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Priority <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number" min="1" max="999"
                      placeholder="e.g. 1"
                      value={form.priority}
                      onChange={onFieldChange('priority')}
                      required
                    />
                    <Form.Text className="text-muted">1 = runs first.</Form.Text>
                  </Form.Group>
                </Col>

                {/* Rule Type */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Rule Type <span className="text-danger">*</span>
                    </Form.Label>
                    {isEdit ? (
                      <Form.Control
                        readOnly value={rule?.ruleType ?? ''}
                        style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                    ) : (
                      <Form.Select
                        value={form.ruleType}
                        onChange={(e) => {
                          onFieldChange('ruleType')(e);
                          // When custom path changes type, reseed defaults
                          if (useCustom && TEMPLATE_PARAM_SCHEMAS[e.target.value] !== undefined) {
                            setParamValues(defaultParams(e.target.value));
                            const a = TEMPLATE_DEFAULT_ACTIONS[e.target.value]
                                   ?? { decision: 'Approved', reason: '' };
                            setActionDecision(a.decision);
                            setActionReason(a.reason);
                          }
                        }}
                        required
                      >
                        <option value="">— Select type —</option>
                        {RULE_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                {/* Description */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Description</Form.Label>
                    <Form.Control
                      placeholder="What does this rule do?"
                      value={form.description}
                      onChange={onFieldChange('description')}
                      maxLength={500}
                    />
                  </Form.Group>
                </Col>

                {/* ─── CONDITION (form-driven) ─── */}
                {isKnownTemplate && !legacyJsonFallback && (
                  <Col md={12}>
                    <div className="rounded-3 p-3"
                         style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="small fw-semibold">
                          <i className="bi bi-funnel me-2 text-primary"></i>
                          When (Condition)
                        </div>
                        <Badge bg="success" style={{ fontSize: 10 }}>
                          <i className="bi bi-magic me-1"></i>Form-driven
                        </Badge>
                      </div>

                      {schemaForCurrent && schemaForCurrent.length === 0 ? (
                        <div className="small text-muted fst-italic">
                          <i className="bi bi-info-circle me-1"></i>
                          This template has no configurable parameters — it always fires.
                        </div>
                      ) : (
                        schemaForCurrent.map(renderField)
                      )}
                    </div>
                  </Col>
                )}

                {/* ─── ACTION (form-driven) ─── */}
                {isKnownTemplate && !legacyJsonFallback && (
                  <Col md={12}>
                    <div className="rounded-3 p-3"
                         style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="small fw-semibold">
                          <i className="bi bi-lightning me-2 text-warning"></i>
                          Then (Action)
                        </div>
                        <Badge bg="success" style={{ fontSize: 10 }}>
                          <i className="bi bi-magic me-1"></i>Form-driven
                        </Badge>
                      </div>

                      <Row className="g-2">
                        <Col md={5}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">
                              Decision <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                              value={actionDecision}
                              onChange={(e) => setActionDecision(e.target.value)}
                              isInvalid={!!actionErrors.decision}
                              required
                            >
                              {DECISIONS.map((d) => (
                                <option key={d} value={d}>{decisionLabel(d)}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={7}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">
                              Reason <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Shown to staff & in audit logs"
                              value={actionReason}
                              onChange={(e) => setActionReason(e.target.value)}
                              maxLength={REASON_MAX_LENGTH}
                              isInvalid={!!actionErrors.reason}
                              required
                            />
                            <Form.Control.Feedback type="invalid">
                              {actionErrors.reason}
                            </Form.Control.Feedback>
                            <Form.Text className="text-muted">
                              {actionReason.length}/{REASON_MAX_LENGTH}
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                )}

                {/* ─── ADVANCED JSON (toggle) ─── */}
                {(isKnownTemplate && !legacyJsonFallback) && (
                  <Col md={12}>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(s => !s)}
                      className="btn btn-link btn-sm p-0"
                      style={{ fontSize: 12, color: '#6c757d' }}
                    >
                      <i className={`bi ${showAdvanced ? 'bi-chevron-down' : 'bi-chevron-right'} me-1`}></i>
                      {showAdvanced ? 'Hide' : 'Show'} advanced JSON
                    </button>

                    {showAdvanced && (
                      <div className="mt-2 rounded-3 p-3"
                           style={{ background: '#fafafa', border: '1px dashed #dee2e6' }}>
                        <div className="small text-muted mb-2">
                          <i className="bi bi-info-circle me-1"></i>
                          Read-only preview of the JSON that will be saved. Edit the form above.
                        </div>
                        <Form.Group className="mb-2">
                          <Form.Label className="small text-muted">conditionExpressionJSON</Form.Label>
                          <Form.Control
                            as="textarea" rows={2} readOnly
                            value={form.conditionExpressionJSON || '{}'}
                            className="font-monospace"
                            style={{ fontSize: 11, background: 'white' }}
                          />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label className="small text-muted">actionExpressionJSON</Form.Label>
                          <Form.Control
                            as="textarea" rows={2} readOnly
                            value={form.actionExpressionJSON || '{}'}
                            className="font-monospace"
                            style={{ fontSize: 11, background: 'white' }}
                          />
                        </Form.Group>
                      </div>
                    )}
                  </Col>
                )}

                {/* ─── RAW JSON (custom-rule path or legacy fallback) ─── */}
                {(!isKnownTemplate || legacyJsonFallback) && (
                  <>
                    <Col md={12}>
                      <div className="rounded-3 p-3"
                           style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <div className="small fw-semibold mb-2">
                          <i className="bi bi-funnel me-2 text-primary"></i>
                          Condition <span className="text-danger">*</span>
                        </div>
                        <Form.Control
                          as="textarea" rows={3}
                          value={form.conditionExpressionJSON}
                          onChange={handleRawConditionChange}
                          isInvalid={!!rawJsonErrors.condition}
                          required
                          className="font-monospace"
                          style={{ fontSize: 11, background: 'white' }}
                        />
                        {rawJsonErrors.condition && (
                          <div className="invalid-feedback d-block">
                            Invalid JSON — {rawJsonErrors.condition}
                          </div>
                        )}
                      </div>
                    </Col>

                    <Col md={12}>
                      <div className="rounded-3 p-3"
                           style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <div className="small fw-semibold mb-2">
                          <i className="bi bi-lightning me-2 text-warning"></i>
                          Action <span className="text-danger">*</span>
                        </div>
                        <Form.Control
                          as="textarea" rows={3}
                          value={form.actionExpressionJSON}
                          onChange={handleRawActionChange}
                          isInvalid={!!rawJsonErrors.action}
                          required
                          className="font-monospace"
                          style={{ fontSize: 11, background: 'white' }}
                        />
                        {rawJsonErrors.action && (
                          <div className="invalid-feedback d-block">
                            Invalid JSON — {rawJsonErrors.action}
                          </div>
                        )}
                      </div>
                    </Col>
                  </>
                )}
              </Row>
            </>
          )}

          {/* Empty state */}
          {!isEdit && !useCustom && !selectedTemplate && (
            <div className="text-center py-4 rounded-3"
                 style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
              <i className="bi bi-arrow-up text-muted" style={{ fontSize: 24 }}></i>
              <div className="text-muted small mt-2">
                Select a template above to continue
              </div>
            </div>
          )}

        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button
            type="submit"
            variant={isEdit ? 'warning' : 'primary'}
            className="px-4 fw-semibold"
            disabled={submitDisabled}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" />
                {isEdit ? 'Saving...' : 'Creating...'}</>
            ) : (
              <><i className={`bi ${isEdit ? 'bi-check2-circle' : 'bi-plus-circle'} me-2`}></i>
                {isEdit ? 'Save Changes' : 'Create Rule'}</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// ── Small UI helpers ─────────────────────────────────────────────────────────
function StepBadge({ n }) {
  return (
    <span className="me-2"
      style={{
        background: '#667eea', color: 'white',
        borderRadius: '50%', width: 20, height: 20,
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 11,
      }}
    >{n}</span>
  );
}

function decisionLabel(d) {
  switch (d) {
    case 'Approved':      return 'Approved — auto-approve for payment';
    case 'Denied':        return 'Denied — reject the claim';
    case 'PendingReview': return 'Pending Review — route to manual review';
    case 'Continue':      return 'Continue — apply effect, let other rules run';
    default:              return d;
  }
}
