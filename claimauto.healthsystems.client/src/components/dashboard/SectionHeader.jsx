import { Badge } from 'react-bootstrap';

/**
 * A section heading with optional "● Live" badge.
 *
 * Props:
 *   title — the heading text
 *   live  — (optional) if true, shows a green "● Live" pill next to the title
 *
 * Example:
 *   <SectionHeader title="System Performance Metrics" live />
 */
export default function SectionHeader({ title, live = false }) {
  return (
    <div className="d-flex align-items-center mb-3">
      <h5 className="fw-bold mb-0 me-2">{title}</h5>
      {live && (
        <Badge bg="success" pill className="text-uppercase" style={{ fontSize: 10 }}>
          ● Live
        </Badge>
      )}
    </div>
  );
}