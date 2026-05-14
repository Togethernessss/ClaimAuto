import { Card, Badge, Button, Alert } from 'react-bootstrap';
import { useState } from 'react';
import MfaSetupModal from './MfaSetupModal';
import MfaDisableModal from './MfaDisableModal';
/**
 * MFA status card — sits in the security column of the Profile page.
 *
 * Props:
 *   user — current user object from AuthContext (we read user.mfaEnabled)
 *
 * Three states it can show:
 *   1. MFA enabled  → green badge + "Disable MFA" button (Phase 5 wires the modal)
 *   2. MFA disabled → orange badge + "Enable MFA" button (opens MfaSetupModal)
 *
 * Visual + behavior is the same whether you arrive here as Admin, Staff, Hospital,
 * or Policyholder — MFA is a per-user setting available to every role.
 */
export default function MfaCard({ user }) {
    const [showSetup, setShowSetup] = useState(false);
    const [showDisable, setShowDisable] = useState(false);

    if (!user) return null;

    const mfaEnabled = !!user.mfaEnabled;

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 py-3">
                    <h6 className="mb-0 fw-semibold">
                        <i className="bi bi-shield-lock text-primary me-2"></i>
                        Multi-Factor Authentication
                    </h6>
                    <small className="text-muted">
                        Add a second layer of security to your account
                    </small>
                </Card.Header>

                <Card.Body>
                    {/* ── Status display ────────────────────────────────────── */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                            <div className="small text-muted text-uppercase fw-bold mb-1">
                                <i className="bi bi-toggle-on me-1"></i> Status
                            </div>
                            <Badge
                                bg={mfaEnabled ? 'success' : 'warning'}
                                className="fs-6 px-3 py-2"
                            >
                                {mfaEnabled ? (
                                    <>
                                        <i className="bi bi-check-circle-fill me-1"></i> Enabled
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-exclamation-triangle-fill me-1"></i> Not Enabled
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>

                    {/* ── Description that adapts to state ─────────────────── */}
                    {mfaEnabled ? (
                        <Alert variant="success" className="d-flex align-items-start small mb-3">
                            <i className="bi bi-shield-check me-2 mt-1"></i>
                            <div>
                                Your account is protected by an Authenticator app. You'll be asked
                                for a code each time you log in.
                            </div>
                        </Alert>
                    ) : (
                        <Alert variant="warning" className="d-flex align-items-start small mb-3">
                            <i className="bi bi-info-circle me-2 mt-1"></i>
                            <div>
                                Without MFA, your account is protected only by your password.
                                We strongly recommend enabling Multi-Factor Authentication.
                            </div>
                        </Alert>
                    )}

                    {/* ── Primary action button ────────────────────────────── */}
                    {mfaEnabled ? (
                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setShowDisable(true)}
                        >
                            <i className="bi bi-shield-slash me-1"></i> Disable MFA
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowSetup(true)}
                        >
                            <i className="bi bi-shield-plus me-1"></i> Enable MFA
                        </Button>
                    )}
                </Card.Body>
            </Card>

            {/* ── Setup modal (opens when user clicks Enable MFA) ─────── */}
            <MfaSetupModal
                show={showSetup}
                onClose={() => setShowSetup(false)}
            />

            <MfaDisableModal                              // ← NEW
                show={showDisable}
                onClose={() => setShowDisable(false)}
            />
        </>
    );
}