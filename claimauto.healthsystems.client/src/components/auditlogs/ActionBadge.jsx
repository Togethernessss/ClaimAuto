import { Badge } from 'react-bootstrap';

// Color map keyed by AuditLogDto.actionCategory
// (which categorizes any action string into one of these 5 buckets)
const BG_BY_CATEGORY = {
  create:  'success',
  update:  'primary',
  delete:  'danger',
  process: 'warning',
  info:    'secondary',
};

// Small bootstrap Badge that color-codes any action name.
// Usage:  <ActionBadge log={log} />
export default function ActionBadge({ log }) {
  if (!log) return null;
  const variant = BG_BY_CATEGORY[log.actionCategory] || 'secondary';
  return (
    <Badge bg={variant} className="text-uppercase" style={{ fontSize: '0.7rem' }}>
      {log.action}
    </Badge>
  );
}