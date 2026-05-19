import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import { getAppealById } from '../../services/appeals/appealService';
import AppealStatusBadge from '../../components/appeals/AppealStatusBadge';
import DecideAppealModal from '../../components/appeals/DecideAppealModal';
import WithdrawConfirmModal from '../../components/appeals/WithdrawConfirmModal';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AppealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = ['Admin', 'InsuranceStaff'].includes(user?.role);

  const [appeal, setAppeal]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [showDecide, setShowDecide]     = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadAppeal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppealById(id);
      setAppeal(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load appeal.';
      setError(typeof msg === 'string' ? msg : 'Failed to load appeal.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAppeal();
  }, [loadAppeal]);

  if (loading) {
    return (
      <Container fluid className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-2 text-muted">Loading appeal details...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </Alert>
        <Button variant="outline-secondary" onClick={() => navigate('/appeals')}>
          <i className="bi bi-arrow-left me-2"></i> Back to Appeals
        </Button>
      </Container>
    );
  }

  if (!appeal) return null;

  const isOwner = appeal.filedByName === user?.name;
  const canWithdraw = isOwner && ['Filed', 'UnderReview'].includes(appeal.status);
  const canDecide   = isStaff && ['Filed', 'UnderReview'].includes(appeal.status);

  return (
    <Container fluid className="px-4 py-4">
      {/* Back button */}
      <Button
        variant="link"
        className="text-decoration-none mb-3 p-0"
        onClick={() => navigate(-1)}
      >
        <i className="bi bi-arrow-left me-2"></i> Back
      </Button>

      {/* Header */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h3 className="fw-bold mb-1">
                <i className="bi bi-journal-text text-primary me-2"></i>
                Appeal APP-{appeal.appealID}
              </h3>
              <div className="text-muted small">
                Linked to Claim <strong className="font-monospace">CLM-{appeal.claimID}</strong>
              </div>
            </div>
            <AppealStatusBadge status={appeal.status} outcome={appeal.outcome} />
          </div>
        </Card.Body>
      </Card>

      {/* Details Grid */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <i className="bi bi-person text-primary me-2"></i> Filing Details
              </h6>
              <div className="mb-2">
                <small className="text-muted d-block">Filed By</small>
                <strong>{appeal.filedByName}</strong>
              </div>
              <div className="mb-2">
                <small className="text-muted d-block">Filed On</small>
                <strong>{formatDateTime(appeal.filedAt)}</strong>
              </div>
              <div>
                <small className="text-muted d-block">Status</small>
                <Badge bg="secondary" className="mt-1">{appeal.status}</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <i className="bi bi-gavel text-warning me-2"></i> Decision
              </h6>
              {appeal.status === 'Decided' ? (
                <>
                  <div className="mb-2">
                    <small className="text-muted d-block">Outcome</small>
                    <AppealStatusBadge status="Decided" outcome={appeal.outcome} />
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Decided By</small>
                    <strong>{appeal.decisionByName || '—'}</strong>
                  </div>
                  <div>
                    <small className="text-muted d-block">Decided On</small>
                    <strong>{formatDateTime(appeal.decisionAt)}</strong>
                  </div>
                </>
              ) : (
                <div className="text-muted small">
                  <i className="bi bi-hourglass-split me-2"></i>
                  No decision yet. Awaiting Insurance Staff review.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Reason */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h6 className="fw-bold mb-3">
            <i className="bi bi-chat-quote text-info me-2"></i> Reason for Appeal
          </h6>
          <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {appeal.reason}
          </p>
        </Card.Body>
      </Card>

      {/* Documents */}
      {appeal.documentsJSON && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <h6 className="fw-bold mb-3">
              <i className="bi bi-paperclip text-secondary me-2"></i> Supporting Documents
            </h6>
            <pre style={{ background: '#f8f9fa', padding: 12, borderRadius: 6, fontSize: '0.85rem' }}>
              {appeal.documentsJSON}
            </pre>
          </Card.Body>
        </Card>
      )}

      {/* Action buttons */}
      {(canDecide || canWithdraw) && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="d-flex gap-2 flex-wrap">
            <Button
              variant="outline-primary"
              onClick={() => navigate(`/claims/${appeal.claimID}`)}
            >
              <i className="bi bi-folder me-2"></i> View Linked Claim
            </Button>
            {canDecide && (
              <Button variant="warning" className="fw-semibold" onClick={() => setShowDecide(true)}>
                <i className="bi bi-gavel me-2"></i> Decide Appeal
              </Button>
            )}
            {canWithdraw && (
              <Button variant="outline-danger" onClick={() => setShowWithdraw(true)}>
                <i className="bi bi-x-circle me-2"></i> Withdraw Appeal
              </Button>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Modals */}
      <DecideAppealModal
        show={showDecide}
        onClose={() => setShowDecide(false)}
        onSuccess={loadAppeal}
        appeal={appeal}
      />
      <WithdrawConfirmModal
        show={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={() => navigate('/appeals')}
        appeal={appeal}
      />
    </Container>
  );
}