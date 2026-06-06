// src/pages/shared/Adjudication/components/AdjudicationResultModal.jsx
import { useState, useEffect } from 'react';
import { Modal, Tab, Nav, Spinner, Alert, Badge } from 'react-bootstrap';
import {
  formatDateTime, formatCurrency,
  decisionVariant, decisionIcon, decisionLabel,
  traceResultStyle,
} from '../utils/adjudicationHelpers';

export default function AdjudicationResultModal({
  show,
  claim,
  result,       // AdjudicationResponseDto
  ruleTrace,    // RuleTraceDto[]
  loading,
  onHide,
}) {
  const [activeTab, setActiveTab] = useState('decision');

  // Reset tab on open
  useEffect(() => {
    if (show) setActiveTab('decision');
  }, [show]);

  // Parse calculations JSON safely
  let calculations = null;
  if (result?.calculationsJSON) {
    try { calculations = JSON.parse(result.calculationsJSON); } catch {}
  }

  const decStyle = result ? decisionVariant(result.decision) : {};

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-check2-square text-primary me-2"></i>
          Adjudication Result — CLM-{claim?.claimID}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted mt-2 small">Loading adjudication record...</div>
          </div>
        )}

        {!loading && !result && (
          <Alert variant="info" className="small py-2">
            <i className="bi bi-info-circle me-2"></i>
            No adjudication record found for this claim yet.
          </Alert>
        )}

        {!loading && result && (
          <>
            {/* Decision pill */}
            <div className="text-center mb-3">
              <div
                className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                style={{
                  background: decStyle.bg,
                  border: `1.5px solid ${decStyle.color}`,
                }}
              >
                <i
                  className={decisionIcon(result.decision)}
                  style={{ color: decStyle.color, fontSize: '1.1rem' }}
                ></i>
                <span className="fw-bold" style={{ color: decStyle.color, fontSize: '1rem' }}>
                  {decisionLabel(result.decision)}
                </span>
              </div>
              <div className="text-muted small mt-2">
                {result.engineVersion === 'manual' ? (
                  <>Manual decision by <strong>{result.performedByName}</strong></>
                ) : (
                  <>Auto-adjudicated by engine <strong>{result.engineVersion}</strong></>
                )}
                {' · '}{formatDateTime(result.executedAt)}
              </div>
            </div>

            {/* Tabs */}
            <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
              <Nav variant="tabs" className="mb-3" style={{ fontSize: 13 }}>
                <Nav.Item>
                  <Nav.Link eventKey="decision">Decision</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="calculations">
                    Calculations
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="trace">
                    Rule Trace
                    {ruleTrace && ruleTrace.length > 0 && (
                      <Badge bg="secondary" className="ms-1" style={{ fontSize: 10 }}>
                        {ruleTrace.length}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>

                {/* Decision tab */}
                <Tab.Pane eventKey="decision">
                  <div className="rounded-3 p-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    {[
                      { label: 'Claim',          value: `CLM-${result.claimID}` },
                      { label: 'Decision',        value: decisionLabel(result.decision) },
                      { label: 'Engine Version',  value: result.engineVersion },
                      { label: 'Performed By',    value: result.performedByName },
                      { label: 'Executed At',     value: formatDateTime(result.executedAt) },
                    ].map((row, i, arr) => (
                      <div
                        key={row.label}
                        className="d-flex justify-content-between py-2"
                        style={{ borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none', fontSize: 13 }}
                      >
                        <span className="text-muted">{row.label}</span>
                        <span className="fw-semibold">{row.value}</span>
                      </div>
                    ))}
                    {result.notes && (
                      <div className="mt-3 p-2 rounded" style={{ background: 'white', border: '1px solid #e9ecef', fontSize: 12 }}>
                        <div className="text-muted small mb-1">Notes</div>
                        <div>{result.notes}</div>
                      </div>
                    )}
                  </div>
                </Tab.Pane>

                {/* Calculations tab */}
                <Tab.Pane eventKey="calculations">
                  {calculations ? (
                    <div className="rounded-3 p-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                      {[
                        { label: 'Billed Amount',      value: formatCurrency(calculations.billed),            highlight: false },
                        { label: 'Allowed Amount',     value: formatCurrency(calculations.allowed),           highlight: false },
                        { label: 'Deductible Applied', value: formatCurrency(calculations.deductibleApplied), highlight: false },
                        { label: 'Copay',              value: formatCurrency(calculations.copay),             highlight: false },
                        { label: 'Payable Amount',     value: formatCurrency(calculations.payable),           highlight: true  },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          className="d-flex justify-content-between py-2"
                          style={{
                            borderBottom: i < arr.length - 1 ? '1px solid #e9ecef' : 'none',
                            fontSize: 13,
                            background: row.highlight ? '#f3f0ff' : 'transparent',
                            margin: row.highlight ? '0 -12px' : undefined,
                            padding: row.highlight ? '8px 12px' : undefined,
                            borderRadius: row.highlight ? 4 : 0,
                          }}
                        >
                          <span className={row.highlight ? 'fw-bold' : 'text-muted'}>{row.label}</span>
                          <span className={`fw-bold ${row.highlight ? '' : ''}`} style={{ color: row.highlight ? '#764ba2' : undefined }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted small">
                      No calculations data available.
                    </div>
                  )}
                </Tab.Pane>

                {/* Rule Trace tab */}
                <Tab.Pane eventKey="trace">
                  {!ruleTrace || ruleTrace.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      No rule trace available.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {ruleTrace.map((trace, idx) => {
                        const ts = traceResultStyle(trace.result);
                        return (
                          <div
                            key={idx}
                            className="rounded-3 p-3"
                            style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 13 }}
                          >
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <div className="fw-semibold">{trace.ruleName}</div>
                              <span style={{
                                background: ts.bg, color: ts.color,
                                padding: '2px 8px', borderRadius: 4,
                                fontSize: 11, fontWeight: 700,
                              }}>
                                {trace.result}
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              <span className="me-2">
                                <i className="bi bi-tag me-1"></i>{trace.ruleType}
                              </span>
                              {trace.ruleID > 0 && (
                                <span className="font-monospace">Rule #{trace.ruleID}</span>
                              )}
                            </div>
                            <div className="mt-1" style={{ color: '#495057' }}>
                              {trace.reason}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Tab.Pane>

              </Tab.Content>
            </Tab.Container>
          </>
        )}

      </Modal.Body>

      <Modal.Footer className="border-0">
        <button className="btn btn-light" onClick={onHide}>Close</button>
      </Modal.Footer>
    </Modal>
  );
}
