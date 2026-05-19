// src/pages/Admin/Rules/components/RuleFormModal.jsx
// Redesigned: no raw JSON — uses human-friendly form fields
// The 5 built-in rules the engine supports are selectable as templates.
// Custom rules can still be written for future engine extensions.

import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';

// ── BUILT-IN RULE TEMPLATES ───────────────────────────────────────────────────
// These match exactly what AdjudicationService.cs handles by rule Name.
// Selecting a template auto-fills all fields correctly.
const RULE_TEMPLATES = [
  {
    id:          'policy-active',
    name:        'Policy Active Check',
    description: 'Denies the claim if the member\'s policy is not currently Active.',
    ruleType:    'Coverage',
    icon:        'bi-shield-check',
    color:       '#085041',
    bg:          '#d1f2eb',
    condition:   '{"field":"policy.status","operator":"eq","value":"Active"}',
    action:      '{"action":"deny","reason":"Policy is not active or not found"}',
  },
  {
    id:          'in-network',
    name:        'In-Network Check',
    description: 'Verifies provider is in-network. Currently accepts all providers (MVP).',
    ruleType:    'Coverage',
    icon:        'bi-hospital',
    color:       '#0C447C',
    bg:          '#e3f2fd',
    condition:   '{"field":"provider.network","operator":"eq","value":"any"}',
    action:      '{"action":"pass","reason":"Provider accepted as in-network"}',
  },
  {
    id:          'amount-threshold',
    name:        'Amount Threshold',
    description: 'Routes claims above ₹5,00,000 to manual review instead of auto-approving.',
    ruleType:    'Validation',
    icon:        'bi-cash-coin',
    color:       '#e65100',
    bg:          '#fff3e0',
    condition:   '{"field":"totalBilledAmount","operator":"lte","value":500000}',
    action:      '{"action":"route","threshold":500000,"reason":"Amount exceeds auto-adjudication threshold"}',
  },
  {
    id:          'duplicate-detection',
    name:        'Duplicate Detection',
    description: 'Denies claims that appear to be duplicates submitted within the last 7 days.',
    ruleType:    'Validation',
    icon:        'bi-files',
    color:       '#6a1b9a',
    bg:          '#f3e5f5',
    condition:   '{"field":"duplicate","operator":"eq","value":false,"window":"7days"}',
    action:      '{"action":"deny","reason":"Duplicate claim detected within 7-day window"}',
  },
  {
    id:          'deductible',
    name:        'Deductible Applied',
    description: 'Reduces the payable amount by the policy\'s deductible before approving payment.',
    ruleType:    'Payment',
    icon:        'bi-percent',
    color:       '#1b5e20',
    bg:          '#e8f5e9',
    condition:   '{"field":"policy.deductibleAmount","operator":"gt","value":0}',
    action:      '{"action":"deduct","field":"policy.deductibleAmount","reason":"Policy deductible applied"}',
  },
];

const RULE_TYPES = ['Coverage', 'Payment', 'Validation'];

export default function RuleFormModal({
  show,
  loading,
  error,
  form,
  mode,       // 'create' | 'edit'
  rule,       // original rule (edit only)
  onHide,
  onFieldChange,
  onSubmit,
}) {
  const isEdit = mode === 'edit';

  // Which template is selected (create mode only)
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // Whether user wants custom expressions instead of template
  const [useCustom, setUseCustom] = useState(false);

  // Reset on open
  useEffect(() => {
    if (show) {
      setSelectedTemplate(null);
      // In edit mode, always show custom since we're editing existing expressions
      setUseCustom(isEdit);
    }
  }, [show, isEdit]);

  // When a template is selected, auto-fill all fields
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    // Trigger each field change to sync with parent form state
    onFieldChange('name')({ target: { value: template.name } });
    onFieldChange('description')({ target: { value: template.description } });
    onFieldChange('ruleType')({ target: { value: template.ruleType } });
    onFieldChange('conditionExpressionJSON')({ target: { value: template.condition } });
    onFieldChange('actionExpressionJSON')({ target: { value: template.action } });
    if (!form.priority) {
      // Auto-assign priority based on template order
      const idx = RULE_TEMPLATES.findIndex(t => t.id === template.id);
      onFieldChange('priority')({ target: { value: String(idx + 1) } });
    }
  };

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

      <Form onSubmit={onSubmit}>
        <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Edit locked info */}
          {isEdit && rule && (
            <Alert variant="info" className="py-2 small mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Rule Type</strong> ({rule.ruleType}) cannot be changed.
              Version will bump automatically on save.
            </Alert>
          )}

          {/* Create Draft info */}
          {!isEdit && (
            <Alert variant="warning" className="py-2 small mb-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              New rules start as <strong>Draft</strong>.
              Activate them from the Rules list to use in adjudication.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="py-2 d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          {/* ── STEP 1: Choose a template (create mode only) ─────────────── */}
          {!isEdit && !useCustom && (
            <div className="mb-4">
              <div className="fw-semibold small mb-2">
                <span className="me-2"
                  style={{
                    background: '#667eea', color: 'white',
                    borderRadius: '50%', width: 20, height: 20,
                    display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11,
                  }}
                >1</span>
                Select a rule template
              </div>

              <div className="d-flex flex-column gap-2">
                {RULE_TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: selectedTemplate === t.id
                        ? `2px solid ${t.color}`
                        : '2px solid #e9ecef',
                      background: selectedTemplate === t.id ? t.bg : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
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
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: t.bg, border: `1.5px solid ${t.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <i className={t.icon} style={{ color: t.color, fontSize: 16 }}></i>
                    </div>

                    {/* Text */}
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

                    {/* Selected check */}
                    {selectedTemplate === t.id && (
                      <i className="bi bi-check-circle-fill"
                        style={{ color: t.color, fontSize: 18, flexShrink: 0 }}
                      ></i>
                    )}
                  </div>
                ))}
              </div>

              {/* Custom option */}
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

          {/* ── STEP 2: Configure the rule ───────────────────────────────── */}
          {(!isEdit && !useCustom && selectedTemplate) || isEdit || useCustom ? (
            <>
              {!isEdit && (
                <div className="fw-semibold small mb-3">
                  <span className="me-2"
                    style={{
                      background: '#667eea', color: 'white',
                      borderRadius: '50%', width: 20, height: 20,
                      display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11,
                    }}
                  >2</span>
                  Configure rule details
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
                      placeholder="e.g. Policy Active Check"
                      value={form.name}
                      onChange={onFieldChange('name')}
                      required
                    />
                    <Form.Text className="text-muted">
                      Must match exactly what the engine evaluates (case-sensitive).
                    </Form.Text>
                  </Form.Group>
                </Col>

                {/* Priority */}
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Priority <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max="999"
                      placeholder="e.g. 1"
                      value={form.priority}
                      onChange={onFieldChange('priority')}
                      required
                    />
                    <Form.Text className="text-muted">
                      1 = runs first.
                    </Form.Text>
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
                        readOnly
                        value={rule?.ruleType ?? ''}
                        style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                    ) : (
                      <Form.Select
                        value={form.ruleType}
                        onChange={onFieldChange('ruleType')}
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
                    />
                  </Form.Group>
                </Col>

                {/* Condition — shown collapsed for template rules, expanded for custom */}
                <Col md={12}>
                  <div
                    className="rounded-3 p-3"
                    style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="small fw-semibold">
                        <i className="bi bi-funnel me-2 text-primary"></i>
                        Condition
                        <span className="text-danger ms-1">*</span>
                      </div>
                      {selectedTemplate && !useCustom && (
                        <Badge bg="success" style={{ fontSize: 10 }}>
                          <i className="bi bi-check2 me-1"></i>Auto-filled from template
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted small mb-2">
                      When should this rule fire?
                    </div>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={form.conditionExpressionJSON}
                      onChange={onFieldChange('conditionExpressionJSON')}
                      required
                      className="font-monospace"
                      style={{ fontSize: 11, background: 'white' }}
                    />
                  </div>
                </Col>

                {/* Action */}
                <Col md={12}>
                  <div
                    className="rounded-3 p-3"
                    style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="small fw-semibold">
                        <i className="bi bi-lightning me-2 text-warning"></i>
                        Action
                        <span className="text-danger ms-1">*</span>
                      </div>
                      {selectedTemplate && !useCustom && (
                        <Badge bg="success" style={{ fontSize: 10 }}>
                          <i className="bi bi-check2 me-1"></i>Auto-filled from template
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted small mb-2">
                      What happens when the condition is met?
                    </div>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={form.actionExpressionJSON}
                      onChange={onFieldChange('actionExpressionJSON')}
                      required
                      className="font-monospace"
                      style={{ fontSize: 11, background: 'white' }}
                    />
                  </div>
                </Col>

              </Row>
            </>
          ) : null}

          {/* Empty state — no template selected yet */}
          {!isEdit && !useCustom && !selectedTemplate && (
            <div
              className="text-center py-4 rounded-3"
              style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}
            >
              <i className="bi bi-arrow-up text-muted" style={{ fontSize: 24 }}></i>
              <div className="text-muted small mt-2">
                Select a template above to continue
              </div>
            </div>
          )}

        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isEdit ? 'warning' : 'primary'}
            className="px-4 fw-semibold"
            disabled={loading || (!isEdit && !useCustom && !selectedTemplate)}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {isEdit ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                <i className={`bi ${isEdit ? 'bi-check2-circle' : 'bi-plus-circle'} me-2`}></i>
                {isEdit ? 'Save Changes' : 'Create Rule'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
