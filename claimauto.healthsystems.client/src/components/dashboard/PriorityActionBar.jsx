import { Card } from 'react-bootstrap';

/**
 * A high-visibility alert bar at the top of each role's dashboard.
 * Shows an icon, a title + description, and a call-to-action button.
 *
 * Same component is used by Admin, Hospital, and Staff dashboards — just
 * with different colors, messages, and click handlers.
 *
 * Props:
 *   accentColor   — Bootstrap color name for the left stripe + icon tint.
 *                   "danger" | "warning" | "primary" | "success" etc.
 *   icon          — Bootstrap icon class, e.g. "bi-exclamation-triangle-fill"
 *   title         — bold message, e.g. "No system alerts right now"
 *   description   — small muted explanation under the title
 *   buttonLabel   — text on the gradient button
 *   buttonIcon    — (optional) icon class shown to the left of the button label
 *   onButtonClick — callback fired when the user clicks the button
 *
 * Example:
 *   <PriorityActionBar
 *     accentColor="danger"
 *     icon="bi-exclamation-triangle-fill"
 *     title="No system alerts right now"
 *     description="Failed jobs and warnings will appear here."
 *     buttonLabel="View System Logs"
 *     buttonIcon="bi-list-stars"
 *     onButtonClick={() => navigate('/audit-logs')}
 *   />
 */
export default function PriorityActionBar({
  accentColor = 'primary',
  icon,
  title,
  description,
  buttonLabel,
  buttonIcon,
  onButtonClick,
}) {
  return (
    <Card className={`border-0 shadow-sm mb-4 border-start border-${accentColor} border-4`}>
      <Card.Body className="d-flex align-items-center flex-wrap gap-3 py-3">
        {/* Circle icon on the left */}
        <div
          className={`rounded-circle bg-${accentColor} bg-opacity-10 text-${accentColor} d-flex align-items-center justify-content-center`}
          style={{ width: 38, height: 38, flexShrink: 0 }}
        >
          <i className={`${icon} fs-5`}></i>
        </div>

        {/* Title + description */}
        <div className="flex-grow-1" style={{ minWidth: 220 }}>
          <div className="fw-semibold">{title}</div>
          <small className="text-muted">{description}</small>
        </div>

        {/* Gradient call-to-action button */}
        <button
          className="btn btn-sm text-white fw-semibold"
          onClick={onButtonClick}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
          }}
        >
          {buttonIcon && <i className={`${buttonIcon} me-1`}></i>}
          {buttonLabel}
        </button>
      </Card.Body>
    </Card>
  );
}