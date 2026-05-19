import { Card, Badge } from 'react-bootstrap';

export default function CircularKPI({
  value,
  unit,
  label,
  target,
  status,
  color,
  percent = 0,
}) {
  const radius        = 50;
  const circumference = 2 * Math.PI * radius;

  // ── Always clamp between 0 and 100 ───────────────────────────
  const safePercent = Math.min(Math.max(percent, 0), 100);
  const offset      = circumference - (safePercent / 100) * circumference;

  return (
    <Card className="border-0 shadow-sm h-100 text-center">
      <Card.Body>
        <div
          className="position-relative mx-auto mb-3"
          style={{ width: 120, height: 120 }}
        >
          <svg width="120" height="120"
            style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="#f1f3f5"
              strokeWidth="10"
            />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="position-absolute top-50 start-50 translate-middle">
            <div className="fs-4 fw-bold" style={{ color }}>
              {value}
            </div>
            <small className="text-muted">{unit}</small>
          </div>
        </div>
        <div className="fw-semibold mb-1">{label}</div>
        <small className="text-muted d-block mb-2">{target}</small>
        <Badge
          bg="light"
          text="dark"
          className="text-uppercase"
          style={{ fontSize: 9 }}
        >
          {status}
        </Badge>
      </Card.Body>
    </Card>
  );
}