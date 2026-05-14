import { Card } from 'react-bootstrap';

/**
 * A small dashboard card showing one metric.
 * Used 4 times per dashboard, 12 times total.
 *
 * Props:
 *   label        — the small uppercase header text, e.g. "Total Users"
 *   value        — the big number/value displayed in the center, e.g. 47 or "—"
 *   icon         — Bootstrap icon class, e.g. "bi-people"
 *   borderColor  — Bootstrap color name: "primary" / "success" / "warning" / "danger"
 *   footerIcon   — (optional) icon class for the small footer text
 *   footerText   — (optional) text below the value, e.g. "No data yet"
 *
 * Example:
 *   <StatCard
 *     label="Total Users"
 *     value="—"
 *     icon="bi-people"
 *     borderColor="primary"
 *     footerIcon="bi-person-plus"
 *     footerText="No data yet"
 *   />
 */
export default function StatCard({
  label,
  value,
  icon,
  borderColor = 'primary',
  footerIcon,
  footerText,
}) {
  return (
    <Card className={`border-0 shadow-sm h-100 border-top border-${borderColor} border-3`}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="text-uppercase text-muted small fw-semibold mb-1">
              {label}
            </div>
            <div className="fs-3 fw-bold text-muted">{value}</div>
            {footerText && (
              <div className="small text-muted">
                {footerIcon && <i className={`${footerIcon} me-1`}></i>}
                {footerText}
              </div>
            )}
          </div>
          <div
            className={`rounded d-flex align-items-center justify-content-center bg-${borderColor} bg-opacity-10`}
            style={{ width: 42, height: 42 }}
          >
            <i className={`${icon} text-${borderColor} fs-5`}></i>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}