import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import ProfileInfoCard from '../../components/identity/ProfileInfoCard';
import MfaCard from '../../components/identity/MfaCard';
import AccountInfoCard from '../../components/identity/AccountInfoCard';


export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    return (
        <Container fluid>
            {/* ── Back button + Page header ──────────────────────────── */}
            <div className="d-flex align-items-center mb-4">
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="me-3"
                    title="Go back"
                >
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>

                <i className="bi bi-person-circle fs-2 text-primary me-3"></i>
                <div>
                    <h3 className="fw-bold mb-0">My Profile</h3>
                    <small className="text-muted">
                        Manage your account settings and security
                    </small>
                </div>
            </div>

            {/* ── Two-column layout: profile (left) + security (right placeholder) ── */}
            <Row className="g-4">
                <Col lg={7}>
                    <ProfileInfoCard user={user} />
                </Col>

                <Col lg={5}>
                    <div className="d-flex flex-column gap-3">
                        <MfaCard user={user} />
                        <AccountInfoCard user={user} />
                    </div>
                </Col>
            </Row>
        </Container>
    );
}