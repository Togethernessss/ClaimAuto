import { useState } from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import MfaSetupModal from './MfaSetupModal';
import MfaDisableModal from './MfaDisableModal';

export default function MfaCard({ user }) {
  const [showSetup,   setShowSetup]   = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  if (!user) return null;

  const mfaEnabled = !!user.mfaEnabled;

  return (
    <>
      <Card
        className="border-0"
        style={{ boxShadow:'0 4px 24px rgba(102,126,234,0.08)', borderRadius:16 }}
      >
        <Card.Header
          className="border-0 py-3 px-4"
          style={{
            background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            borderRadius:'16px 16px 0 0',
          }}
        >
          <h6 className="mb-0 fw-bold" style={{ color:'#4c1d95' }}>
            <i className="bi bi-shield-lock-fill me-2" style={{ color:'#7c3aed' }}></i>
            Two-Factor Authentication
          </h6>
          <small style={{ color:'#7c3aed', opacity:0.7 }}>
            Protect your account with an authenticator app
          </small>
        </Card.Header>

        <Card.Body className="px-4 py-3">
          {/* Status row */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">

              {/* Shield icon box */}
              <div
                style={{
                  width:44, height:44, borderRadius:12,
                  background: mfaEnabled
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: mfaEnabled
                    ? '0 4px 12px rgba(16,185,129,0.3)'
                    : '0 4px 12px rgba(245,158,11,0.3)',
                }}
              >
                <i
                  className={`bi ${mfaEnabled ? 'bi-shield-check' : 'bi-shield-exclamation'} text-white`}
                  style={{ fontSize:20 }}
                ></i>
              </div>

              <div>
                <div className="fw-semibold" style={{ color:'#1e1b4b', fontSize:14 }}>
                  {mfaEnabled ? 'MFA is Enabled' : 'MFA is Disabled'}
                </div>
                <div style={{ fontSize:12, color:'#6b7280' }}>
                  {mfaEnabled
                    ? 'Secured with a second factor.'
                    : 'Only a password protects this account.'}
                </div>
              </div>
            </div>

            <Badge
              className="rounded-pill"
              style={{
                background: mfaEnabled ? '#10b981' : '#f59e0b',
                fontSize:11, padding:'5px 10px',
              }}
            >
              {mfaEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>

          {/* Warning strip when MFA is off */}
          {!mfaEnabled && (
            <div
              className="rounded-3 p-3 mb-3 d-flex align-items-start gap-2"
              style={{ background:'#fffbeb', border:'1px solid #fde68a' }}
            >
              <i className="bi bi-exclamation-triangle-fill text-warning mt-1" style={{ fontSize:14 }}></i>
              <div style={{ fontSize:12, color:'#92400e' }}>
                We strongly recommend enabling MFA to protect your account.
              </div>
            </div>
          )}

          {/* Action button — same onClick as original */}
          {mfaEnabled ? (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowDisable(true)}
              className="rounded-3"
              style={{ fontSize:13 }}
            >
              <i className="bi bi-shield-slash me-1"></i> Disable MFA
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowSetup(true)}
              className="rounded-3"
              style={{
                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border:'none', fontSize:13,
              }}
            >
              <i className="bi bi-shield-plus me-1"></i> Enable MFA
            </Button>
          )}
        </Card.Body>
      </Card>

      {/* Modals — exactly same as before */}
      <MfaSetupModal   show={showSetup}   onClose={() => setShowSetup(false)}   />
      <MfaDisableModal show={showDisable} onClose={() => setShowDisable(false)} />
    </>
  );
}