import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { GRADIENT, heroFeatures } from '../../data/homeData';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      style={{
        background: GRADIENT,
        minHeight: '92vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '80px',
        paddingBottom: '80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -80, right: -80, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      <Container>
        <Row className="align-items-center g-5">
          <Col lg={7}>
            <Badge bg="light" className="mb-3 px-3 py-2 rounded-pill fw-semibold" style={{ color: '#764ba2', fontSize: '0.8rem' }}>
              <i className="bi bi-plus-circle-fill me-1"></i>
              Health Insurance Platform
            </Badge>

            <h1 className="text-white fw-bold mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.2 }}>
              Smart Claims.<br />
              Faster Decisions.<br />
              <span style={{ color: '#c3d9ff' }}>Complete Peace of Mind.</span>
            </h1>

            <p className="mb-5" style={{ color: 'rgba(255,255,255,0.82)', fontSize: '1.05rem', lineHeight: 1.75, maxWidth: 560 }}>
              ClaimAuto automates your entire health insurance claims pipeline —
              from submission and adjudication to fraud detection, appeals, and
              real-time payments. Built for hospitals, insurers, and policyholders.
            </p>

            <div className="d-flex flex-wrap gap-3">
              <Button size="lg" variant="light" className="fw-bold px-5 rounded-pill shadow"
                style={{ color: '#667eea' }} onClick={() => navigate('/register')}>
                <i className="bi bi-person-plus-fill me-2"></i> Create Free Account
              </Button>
              <Button size="lg" variant="outline-light" className="fw-semibold px-5 rounded-pill"
                onClick={() => navigate('/login')}>
                <i className="bi bi-play-circle me-2"></i> Sign In
              </Button>
            </div>
          </Col>

          <Col lg={5} className="d-none d-lg-block text-center">
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              borderRadius: 24,
              padding: '40px 36px',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              <i className="bi bi-heart-pulse-fill" style={{ fontSize: '5rem', color: '#ffffff', opacity: 0.9 }}></i>
              <div className="mt-3 text-white fw-bold" style={{ fontSize: '1.15rem' }}>Real-time Health Claims</div>
              <div className="mt-2" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem' }}>
                From submission to payment in minutes
              </div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />
              {heroFeatures.map((f) => (
                <div key={f.label} className="d-flex align-items-center gap-2 mb-2"
                  style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                  <i className={`${f.icon} text-warning`} style={{ fontSize: '1rem', flexShrink: 0 }}></i>
                  {f.label}
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}