import { Container, Row, Col, Badge } from 'react-bootstrap';
import { GRADIENT, stepsData } from '../../data/homeData';

export default function HowItWorksSection() {
  return (
    <section id="how" style={{ background: '#fff', padding: '80px 0' }}>
      <Container>
        <div className="text-center mb-5">
          <Badge className="mb-3 px-3 py-2 rounded-pill" style={{ background: GRADIENT, color: '#fff', fontSize: '0.78rem' }}>
            WORKFLOW
          </Badge>
          <h2 className="fw-bold" style={{ fontSize: '2rem', color: '#2c3e50' }}>How ClaimAuto Works</h2>
          <p className="text-muted mt-2">From claim submission to final payment — fully automated.</p>
        </div>

        <Row className="g-4 align-items-start justify-content-center">
          {stepsData.map((step, idx) => (
            <Col md={6} lg={3} key={step.step} className="text-center">
              <div className="position-relative">
                <div className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 80, height: 80, background: GRADIENT }}>
                  <i className={step.icon} style={{ fontSize: '1.8rem', color: '#fff' }}></i>
                </div>
                {idx < stepsData.length - 1 && (
                  <div className="d-none d-lg-block"
                    style={{ position: 'absolute', top: 40, right: -50, fontSize: '1.5rem', color: '#c3b1e1', fontWeight: 300 }}>
                    →
                  </div>
                )}
              </div>
              <div className="fw-bold mb-1" style={{ color: '#764ba2', fontSize: '0.78rem', letterSpacing: 1 }}>
                STEP {step.step}
              </div>
              <h6 className="fw-bold mb-2" style={{ color: '#1e2a3a' }}>{step.title}</h6>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>{step.desc}</p>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}