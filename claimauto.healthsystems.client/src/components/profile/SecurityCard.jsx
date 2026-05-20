import React, { useState } from 'react';
import MfaSetupModal    from '../identity/MfaSetupModal';
import MfaDisableModal  from '../identity/MfaDisableModal';

export default function SecurityCard({ user }) {
  const [showMfaSetup,   setShowMfaSetup]   = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);

  const score      = user.mfaEnabled ? 100 : 25;
  const scoreLabel = score === 100 ? 'Strong' : score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Weak';
  const scoreColor = score === 100 ? '#16a34a' : score >= 50 ? '#f97316' : '#dc2626';
  const barColor   = score === 100
    ? 'linear-gradient(90deg,#16a34a,#22c55e)'
    : score >= 50
    ? 'linear-gradient(90deg,#f97316,#facc15)'
    : 'linear-gradient(90deg,#ef4444,#f97316)';

  return (
    <div className="profile-card card border-0 shadow-sm overflow-hidden h-100">

      <div className="profile-card-header d-flex align-items-center gap-2 px-4 py-3">
        <div className="sec-icon-wrap">
          <i className="bi bi-shield-check"></i>
        </div>
        <span className="fw-semibold" style={{ color: '#1e1b4b', fontSize: 15 }}>Multi-Factor Authentication</span>
      </div>

      <div className="card-body px-4 py-4">

        {user.mfaEnabled ? (
          <div className="mfa-badge-enabled mb-3">
            <i className="bi bi-check-circle-fill me-2"></i> Enabled
          </div>
        ) : (
          <div className="mfa-badge-disabled mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i> Not Enabled
          </div>
        )}

        {user.mfaEnabled ? (
          <div className="sec-info-box sec-success mb-3">
            <i className="bi bi-shield-fill-check me-2"></i>
            Your account has an extra layer of protection. MFA is active.
          </div>
        ) : (
          <div className="sec-info-box sec-warning mb-3">
            Without MFA, your account is protected only by your password.
            We strongly recommend enabling your Authenticator.
          </div>
        )}

        {user.mfaEnabled ? (
          <button className="btn w-100 btn-outline-danger btn-sm mb-0" onClick={() => setShowMfaDisable(true)}>
            <i className="bi bi-shield-slash me-1"></i> Disable MFA
          </button>
        ) : (
          <button
            className="btn w-100 btn-sm d-flex align-items-center justify-content-center gap-2 mb-0"
            style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13 }}
            onClick={() => setShowMfaSetup(true)}
          >
            <i className="bi bi-shield-lock-fill"></i> Enable MFA
          </button>
        )}

        <div className="score-section">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="score-title">
              <i className="bi bi-lock me-1"></i> Account Security Score
            </span>
            <span className="score-value" style={{ color: scoreColor }}>
              {scoreLabel} — {score}%
            </span>
          </div>

          <div className="score-bar-bg mb-2">
            <div className="score-bar-fill" style={{ width: score + '%', background: barColor }}></div>
          </div>

          <div className="d-flex justify-content-between mb-3">
            {['Weak', 'Fair', 'Good', 'Strong'].map((t) => (
              <span
                key={t}
                className="score-tick"
                style={{ color: t === scoreLabel ? scoreColor : '#9ca3af', fontWeight: t === scoreLabel ? 600 : 400 }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="d-flex flex-column gap-2">
            <div className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
              <span className="factor-dot" style={{ background: '#16a34a' }}></span>
              <span style={{ color: '#16a34a' }}>Password is set</span>
            </div>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
              <span className="factor-dot" style={{ background: user.mfaEnabled ? '#16a34a' : '#ef4444' }}></span>
              <span style={{ color: user.mfaEnabled ? '#16a34a' : '#dc2626' }}>
                {user.mfaEnabled ? 'MFA enabled — account is fully secured' : 'MFA not enabled — enable to reach Strong'}
              </span>
            </div>
          </div>
        </div>

      </div>

      <MfaSetupModal   show={showMfaSetup}   onClose={() => setShowMfaSetup(false)} />
      <MfaDisableModal show={showMfaDisable} onClose={() => setShowMfaDisable(false)} />
    </div>
  );
}