import { useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { GRADIENT, navLinks } from '../../data/homeData';

export default function HomeNavbar() {
  const navigate = useNavigate();

  return (
    <Navbar
      expand="lg"
      sticky="top"
      style={{ background: GRADIENT, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
    >
      <Container>
        <Navbar.Brand
          className="fw-bold text-white d-flex align-items-center gap-2"
          style={{ fontSize: '1.4rem', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <i className="bi bi-shield-heart-fill" style={{ color: '#c3d9ff' }}></i>
          ClaimAuto
          <span className="fw-light" style={{ fontSize: '0.85rem', opacity: 0.75, marginLeft: 4 }}>
            Health Systems
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
          <i className="bi bi-list text-white fs-4"></i>
        </Navbar.Toggle>

        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto ms-4 gap-1">
            {navLinks.map((link) => (
              <Nav.Link
                key={link.label}
                href={link.href}
                className="text-white fw-semibold px-3 py-1 rounded-pill"
                style={{ opacity: 0.85, fontSize: '0.9rem' }}
                onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={(e) => (e.target.style.background = 'transparent')}
              >
                {link.label}
              </Nav.Link>
            ))}
          </Nav>

          <div className="d-flex gap-2 mt-2 mt-lg-0">
            <Button
              variant="outline-light"
              className="fw-semibold px-4 rounded-pill"
              size="sm"
              onClick={() => navigate('/login')}
            >
              <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
            </Button>
            <Button
              variant="light"
              className="fw-bold px-4 rounded-pill"
              size="sm"
              style={{ color: '#667eea' }}
              onClick={() => navigate('/register')}
            >
              <i className="bi bi-person-plus me-1"></i> Get Started
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}