import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { GRADIENT } from '../../data/homeData';

export default function HomeFooter() {
  const navigate = useNavigate();

  return (
    <footer style={{ background: '#1a1a2e', padding: '48px 0 24px', color: 'rgba(255,255,255,0.55)' }}>
      <Container>
        <Row className="g-4 mb-4">
          <Col md={4}>
            <div className="fw-bold text-white d-flex align-items-center gap-2 mb-2" style={{ fontSize: '1.2rem' }}>
              <i className="bi bi-shield-heart-fill" style={{ color: '#667eea' }}></i>
              ClaimAuto Health Systems
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
              Automating health insurance claims from submission to payment.
              Built with care for patients, hospitals, and insurers.
            </p>
          </Col>

          <Col md={2}>
            <div className="text-white fw-semibold mb-3 small text-uppercase" style={{ letterSpacing: 1 }}>
              Platform
            </div>
            {['Features', 'How It Works', 'Security', 'API Docs'].map((l) => (
              <div key={l} className="mb-2">
                <a href="#" className="text-decoration-none" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>{l}</a>
              </div>
            ))}
          </Col>

          <Col md={2}>
            <div className="text-white fw-semibold mb-3 small text-uppercase" style={{ letterSpacing: 1 }}>
              Stakeholders
            </div>
            {['Policyholders', 'Hospitals', 'Insurance Staff', 'Admins'].map((l) => (
              <div key={l} className="mb-2">
                <a href="#" className="text-decoration-none"
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}
                  onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                  {l}
                </a>
              </div>
            ))}
          </Col>

          <Col md={4}>
            <div className="text-white fw-semibold mb-3 small text-uppercase" style={{ letterSpacing: 1 }}>
              Get Access
            </div>
            <p style={{ fontSize: '0.88rem' }}>Already have an account? Sign in to your portal.</p>
            <div className="d-flex gap-2 flex-wrap">
              <Button size="sm" variant="outline-light" className="rounded-pill fw-semibold"
                onClick={() => navigate('/login')}>
                <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
              </Button>
              <Button size="sm" className="rounded-pill fw-semibold"
                style={{ background: GRADIENT, border: 'none' }}
                onClick={() => navigate('/register')}>
                <i className="bi bi-person-plus me-1"></i> Register
              </Button>
            </div>
          </Col>
        </Row>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <div className="d-flex flex-wrap justify-content-between align-items-center pt-2 gap-2" style={{ fontSize: '0.82rem' }}>
          <span>© 2026 ClaimAuto Health Systems. All rights reserved.</span>
          <span>
            Built with{' '}
            <i className="bi bi-heart-fill" style={{ color: '#764ba2' }}></i>
            {' '}by Team ClaimAuto · Cognizant Project 1
          </span>
        </div>
      </Container>
    </footer>
  );
}