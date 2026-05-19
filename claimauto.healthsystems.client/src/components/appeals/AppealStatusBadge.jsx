import { Badge } from 'react-bootstrap';

// Backend statuses: Filed, UnderReview, Decided, Withdrawn
// Outcomes (when Decided): Upheld, Overturned, PartiallyUpheld

export function statusVariant(status) {
  switch (status) {
    case 'Filed':       return 'info';
    case 'UnderReview': return 'warning';
    case 'Decided':     return 'success';
    case 'Withdrawn':   return 'secondary';
    default:            return 'secondary';
  }
}

export function outcomeVariant(outcome) {
  switch (outcome) {
    case 'Overturned':       return 'success';
    case 'Upheld':           return 'danger';
    case 'PartiallyUpheld':  return 'warning';
    default:                 return 'secondary';
  }
}

export default function AppealStatusBadge({ status, outcome }) {
  if (status === 'Decided' && outcome) {
    return (
      <Badge bg={outcomeVariant(outcome)} className="px-3 py-2">
        {outcome}
      </Badge>
    );
  }
  return (
    <Badge bg={statusVariant(status)} className="px-3 py-2">
      {status}
    </Badge>
  );
}