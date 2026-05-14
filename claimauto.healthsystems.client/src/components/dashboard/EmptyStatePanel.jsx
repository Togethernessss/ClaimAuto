/**
 * A friendly placeholder shown when a panel has no data yet.
 * Typically used as the body of a DashboardPanel.
 *
 * Props:
 *   icon        — Bootstrap icon class, e.g. "bi-clock-history"
 *   title       — bold message, e.g. "No activity yet"
 *   description — small muted explanation
 *
 * Example:
 *   <EmptyStatePanel
 *     icon="bi-clock-history"
 *     title="No activity yet"
 *     description="System events will appear here in real time."
 *   />
 */
export default function EmptyStatePanel({ icon, title, description }) {
  return (
    <div className="text-center py-5">
      <i className={icon} style={{ fontSize: 48, color: '#dfe4ea' }}></i>
      <div className="fw-semibold text-muted mt-3">{title}</div>
      <div className="small text-muted mt-1">{description}</div>
    </div>
  );
}