import { useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { GRADIENT } from '../../data/homeData';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section style={{ background: GRADIENT, padding: '70px 0', textAlign: 'center' }}>
      <Container>
        <i className="bi bi-heart-pulse" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.6)' }}></i>
        <h2 className="text-white fw-bold mt-3 mb-3" style={{ fontSize: '1.9rem' }}>
          Ready to Modernise Your Claims Process?
        </h2>
        <p className="mb-4" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 24px' }}>
          Join thousands of policyholders, hospitals, and insurers already
          using ClaimAuto to process claims faster and smarter.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Button size="lg" variant="light" className="fw-bold px-5 rounded-pill shadow"
            style={{ color: '#667eea' }} onClick={() => navigate('/register')}>
            <i className="bi bi-person-plus-fill me-2"></i> Create Your Account
          </Button>
          <Button size="lg" variant="outline-light" className="fw-semibold px-5 rounded-pill"
            onClick={() => navigate('/login')}>
            <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
          </Button>
        </div>
      </Container>
    </section>
  );
}