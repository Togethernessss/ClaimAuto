import { useNavigate } from 'react-router-dom';
import { Card, Table, Badge, Button } from 'react-bootstrap';
import { formatCurrency, formatDate, claimStatusVariant } from '../../data/policyholderDashboardData';

export default function RecentClaimsTable({ claims }) {
  const navigate = useNavigate();
  const recent = claims.slice(0, 5);

  return (
    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
      <Card.Header className="bg-white border-bottom d-flex align-items-center justify-content-between py-3">
        <div className="fw-bold d-flex align-items-center">
          <i className="bi bi-folder2 text-primary me-2 fs-5"></i>
          <span>Recent Claims</span>
        </div>
        <Button
          size="sm"
          variant="outline-primary"
          className="rounded-pill"
          onClick={() => navigate('/policyholder/claims')}
        >
          View All <i className="bi bi-arrow-right ms-1"></i>
        </Button>
      </Card.Header>

      <Card.Body className="p-0">
        {recent.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-folder-x" style={{ fontSize: 40, color: '#dfe4ea' }}></i>
            <div className="text-muted small mt-2">No claims yet</div>
            <small className="text-muted">Claims submitted by hospitals will appear here</small>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="ps-4 py-2 text-muted small fw-semibold text-uppercase">Claim ID</th>
                  <th className="py-2 text-muted small fw-semibold text-uppercase">Date</th>
                  <th className="py-2 text-muted small fw-semibold text-uppercase">Hospital</th>
                  <th className="py-2 text-muted small fw-semibold text-uppercase">Amount</th>
                  <th className="py-2 text-muted small fw-semibold text-uppercase">Status</th>
                  <th className="py-2 pe-4 text-end"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr
                    key={c.claimID}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/claims?focus=${c.claimID}`)}
                  >
                    <td className="ps-4 py-3 fw-semibold font-monospace">CLM-{c.claimID}</td>
                    <td className="py-3 small">{formatDate(c.dateOfService)}</td>
                    <td className="py-3">
                      <div>{c.hospitalName}</div>
                      {c.procedureName && <small className="text-muted">{c.procedureName}</small>}
                    </td>
                    <td className="py-3 fw-semibold">{formatCurrency(c.amount)}</td>
                    <td className="py-3">
                      <Badge bg={claimStatusVariant(c.status)} className="px-3 py-2">{c.status}</Badge>
                    </td>
                    <td className="py-3 pe-4 text-end">
                      <Button size="sm" variant="link" className="text-decoration-none p-0">
                        <i className="bi bi-chevron-right text-muted"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}