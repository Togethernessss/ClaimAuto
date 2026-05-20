import { Alert, Button } from 'react-bootstrap';

export default function AppealsHeader({ onFileAppeal, canFile, successMsg, errorMsg }) {
    return (
        <>
            <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#2d3436' }}>
                        <i className="bi bi-megaphone me-2" style={{ color: '#667eea' }}></i>
                        Appeals
                    </h2>
                    <p className="text-muted mb-0">
                        File appeals on rejected claims, track review progress, and view decisions.
                    </p>
                </div>
                {canFile && (
                    <Button
                        onClick={onFileAppeal}
                        style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 24px',
                        }}
                    >
                        <i className="bi bi-file-earmark-plus me-2"></i>File Appeal
                    </Button>
                )}
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