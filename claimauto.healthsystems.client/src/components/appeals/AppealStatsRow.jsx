import { Row, Col } from 'react-bootstrap';
import StatCard from '../dashboard/StatCard';

export default function AppealStatsRow({ appeals }) {
  const total       = appeals.length;
  const pending     = appeals.filter((a) => ['Filed', 'UnderReview'].includes(a.status)).length;
  const overturned  = appeals.filter((a) => a.outcome === 'Overturned').length;
  const upheld      = appeals.filter((a) => a.outcome === 'Upheld').length;

  return (
    <Row className="g-3 mb-4">
      <Col md={6} lg={3}>
        <StatCard
          label="Total Appeals"
          value={total}
          icon="bi-journal-text"
          borderColor="primary"
          footerIcon="bi-calendar"
          footerText="All time"
        />
      </Col>
      <Col md={6} lg={3}>
        <StatCard
          label="Pending Decision"
          value={pending}
          icon="bi-hourglass-split"
          borderColor="warning"
          footerIcon="bi-clock"
          footerText="Filed or Under Review"
        />
      </Col>
      <Col md={6} lg={3}>
        <StatCard
          label="Overturned"
          value={overturned}
          icon="bi-check2-circle"
          borderColor="success"
          footerIcon="bi-arrow-up"
          footerText="Decision in favor"
        />
      </Col>
      <Col md={6} lg={3}>
        <StatCard
          label="Upheld"
          value={upheld}
          icon="bi-x-circle"
          borderColor="danger"
          footerIcon="bi-arrow-down"
          footerText="Rejection confirmed"
        />
      </Col>
    </Row>
  );
}