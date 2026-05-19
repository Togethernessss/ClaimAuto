import { Alert, Button } from 'react-bootstrap';

export default function FraudHeader({ onScoreClaim, successMsg, errorMsg }) {
    return (
        <>
            <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#2d3436' }}>
                        <i className="bi bi-shield-exclamation me-2" style={{ color: '#667eea' }}></i>
                        Fraud Detection
                    </h2>
                    <p className="text-muted mb-0">
                        Score claims for fraud risk, investigate flagged cases, and resolve outcomes.
                    </p>
                </div>
                <Button
                    onClick={onScoreClaim}
                    style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 24px',
                    }}
                >
                    <i className="bi bi-speedometer2 me-2"></i>Score a Claim
                </Button>
            </div>

            {successMsg && (
                <Alert variant="success" className="py-2 mb-3">
                    <i className="bi bi-check-circle me-2"></i>{successMsg}
                </Alert>
            )}
            {errorMsg && (
                <Alert variant="danger" className="py-2 mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>{errorMsg}
                </Alert>
            )}
        </>
    );
}