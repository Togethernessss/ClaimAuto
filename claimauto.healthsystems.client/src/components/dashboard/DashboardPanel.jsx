import { Card } from 'react-bootstrap';

/**
 * A standard card with an icon-prefixed header and a slot for body content.
 * Used for "Recent Activity", "Pending Approvals", "Active Policies", etc.
 *
 * Props:
 *   icon       — Bootstrap icon class, e.g. "bi-activity"
 *   iconColor  — Bootstrap text color name: "primary" | "success" | "warning" | "danger"
 *   title      — bold header text
 *   subtitle   — (optional) small muted text below the title
 *   children   — the body content (typically an EmptyStatePanel or a real list/table)
 *
 * Example:
 *   <DashboardPanel
 *     icon="bi-activity"
 *     iconColor="primary"
 *     title="Recent System Activity"
 *     subtitle="Live audit trail · latest events first"
 *   >
 *     <EmptyStatePanel icon="bi-clock-history" title="No activity yet"
 *                      description="System events will appear here." />
 *   </DashboardPanel>
 */
export default function DashboardPanel({
  icon,
  iconColor = 'primary',
  title,
  subtitle,
  children,
}) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Header className="bg-white border-0 py-3">
        <h6 className="mb-0 fw-semibold">
          {icon && <i className={`${icon} text-${iconColor} me-2`}></i>}
          {title}
        </h6>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}