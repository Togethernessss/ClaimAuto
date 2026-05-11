import { Container, Row, Col } from 'react-bootstrap';
import { statsData } from '../../data/homeData';

export default function StatsBanner() {
  return (
    <section style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '36px 0' }}>
      <Container>
        <Row className="g-4 text-center justify-content-center">
          {statsData.map((s) => (
            <Col xs={6} md={3} key={s.label}>
              <i className={s.icon} style={{ fontSize: '2.2rem', color: s.color }}></i>
              <div className="fw-bold mt-2 mb-1" style={{ fontSize: '1.7rem', color: '#2c3e50' }}>
                {s.val}
              </div>
              <div className="text-muted small">{s.label}</div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}