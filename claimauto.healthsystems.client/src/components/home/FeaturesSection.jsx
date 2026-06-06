import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { featuresData } from '../../data/homeData';

export default function FeaturesSection() {
  return (
    <section id="features" style={{ background: '#f8f9fa', padding: '80px 0' }}>
      <Container>
        <div className="text-center mb-5">
          <Badge bg="primary" className="mb-3 px-3 py-2 rounded-pill" style={{ opacity: 0.85, fontSize: '0.78rem' }}>
            PLATFORM FEATURES
          </Badge>
          <h2 className="fw-bold" style={{ fontSize: '2rem', color: '#2c3e50' }}>
            Everything You Need, All in One Place
          </h2>
          <p className="text-muted mt-2" style={{ maxWidth: 540, margin: '0 auto' }}>
            A complete end-to-end health insurance claims management system
            built for speed, accuracy, and transparency.
          </p>
        </div>

        <Row className="g-4">
          {featuresData.map((f) => (
            <Col md={6} lg={4} key={f.title}>
              <Card
                className="border-0 shadow-sm h-100"
                style={{ borderRadius: 14, transition: 'transform 0.18s, box-shadow 0.18s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Card.Body className="p-4">
                  <div className="rounded-3 d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 54, height: 54, background: f.color }}>
                    <i className={f.icon} style={{ fontSize: '1.5rem', color: f.iconColor }}></i>
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: '#1e2a3a' }}>{f.title}</h5>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{f.desc}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}