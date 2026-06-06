import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { formatDate, appealStatusVariant } from '../../data/policyholderDashboardData';
import { withdrawAppealById } from '../../services/policyholder/dashboardService';

export default function ActiveAppealCard({ appeal, onUpdate }) {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!appeal) return null;

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await withdrawAppealById(appeal.appealID);
      setShowWithdraw(false);
      await onUpdate?.();
    } catch (err) {
      alert('Failed to withdraw appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <Card.Header className="bg-white border-bottom d-flex align-items-center justify-content-between py-3">
          <div className="fw-bold d-flex align-items-center">
            <i className="bi bi-scales text-info me-2 fs-5"></i>
            <span>Active Appeal</span>
          </div>
          <Badge bg={appealStatusVariant(appeal.status)} className="px-3 py-2">{appeal.status}</Badge>
        </Card.Header>

        <Card.Body>
          <div className="small mb-2"><strong>Appeal ID:</strong> APP-{appeal.appealID}</div>
          <div className="small mb-2"><strong>Claim:</strong> CLM-{appeal.claimID}</div>
          <div className="small mb-2"><strong>Filed:</strong> {formatDate(appeal.filedAt)}</div>
          <div className="small mt-2 mb-3 text-muted" style={{ fontStyle: 'italic' }}>"{appeal.reason}"</div>

          <Alert variant="warning" className="small py-2 mb-3">
            <i className="bi bi-hourglass-split me-2"></i>
            Under review by Insurance Staff
          </Alert>

          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-primary"
              className="rounded-pill flex-grow-1"
              onClick={() => navigate(`/appeals?focus=${appeal.appealID}`)}
            >
              <i className="bi bi-eye me-1"></i> Details
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              className="rounded-pill flex-grow-1"
              onClick={() => setShowWithdraw(true)}
            >
              <i className="bi bi-x-circle me-1"></i> Withdraw
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Withdraw Confirmation Modal */}
      <Modal show={showWithdraw} onHide={() => setShowWithdraw(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-warning me-2"></i>
            Withdraw Appeal?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to withdraw <strong>APP-{appeal.appealID}</strong>?</p>
          <Alert variant="warning" className="small mb-0">
            This action cannot be undone. The original claim rejection will stand.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWithdraw(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleWithdraw} disabled={loading}>
            {loading ? <><Spinner size="sm" animation="border" className="me-2" />Withdrawing...</> : 'Yes, Withdraw'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}