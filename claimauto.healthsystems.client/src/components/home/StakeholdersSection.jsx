import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { stakeholdersData } from '../../data/homeData';

export default function StakeholdersSection() {
  const navigate = useNavigate();

  return (
    <section id="stakeholders" style={{ background: '#f8f9fa', padding: '80px 0' }}>
      <Container>
        <div className="text-center mb-5">
          <Badge bg="success" className="mb-3 px-3 py-2 rounded-pill" style={{ opacity: 0.85, fontSize: '0.78rem' }}>
            WHO IT HELPS
          </Badge>
          <h2 className="fw-bold" style={{ fontSize: '2rem', color: '#2c3e50' }}>
            A Portal for Every Stakeholder
          </h2>
          <p className="text-muted mt-2">
            Each role gets a personalised experience with the right tools and data.
          </p>
        </div>

        <Row className="g-4">
          {stakeholdersData.map((s) => (
            <Col md={6} xl={3} key={s.role}>
              <Card
                className="border-0 shadow-sm h-100"
                style={{ borderRadius: 16, transition: 'transform 0.18s, box-shadow 0.18s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.13)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Card.Body className="p-4 d-flex flex-column">
                  <div className="rounded-3 d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 56, height: 56, background: s.color }}>
                    <i className={s.icon} style={{ fontSize: '1.6rem', color: s.iconColor }}></i>
                  </div>

                  <h5 className="fw-bold mb-1" style={{ color: '#1e2a3a' }}>{s.role}</h5>
                  <p className="mb-3" style={{ fontSize: '0.82rem', fontStyle: 'italic', color: s.iconColor, fontWeight: 600 }}>
                    "{s.tagline}"
                  </p>
                  <p className="text-muted mb-3" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{s.desc}</p>

                  <ul className="mb-4 ps-0" style={{ listStyle: 'none', fontSize: '0.85rem' }}>
                    {s.features.map((f) => (
                      <li key={f} className="mb-1 d-flex align-items-center gap-2">
                        <i className="bi bi-check2-circle" style={{ color: s.iconColor, flexShrink: 0 }}></i>
                        <span className="text-muted">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline-primary"
                    className="w-100 fw-semibold rounded-pill mt-auto"
                    style={{ borderColor: s.iconColor, color: s.iconColor, fontSize: '0.88rem' }}
                    onClick={() => navigate('/login')}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    {s.btnLabel}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}