import { Table, Badge, Button, Spinner } from 'react-bootstrap';
import {
    formatDate, priorityStyle, priorityIcon,
    caseStatusStyle, caseStatusIcon, OPEN_STATUSES,
} from '../utils/fraudHelpers';

export default function FraudCasesTable({
    cases, loading, error, isPendingTab,
    onViewDetail, onResolve, onRetry,
}) {
    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#667eea' }} />
                <div className="text-muted mt-2">Loading fraud cases…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-5">
                <i className="bi bi-exclamation-triangle text-danger fs-1"></i>
                <p className="text-muted mt-2">{error}</p>
                <Button variant="outline-primary" size="sm" onClick={onRetry}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Retry
                </Button>
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="bi bi-shield-check fs-1" style={{ color: '#27ae60' }}></i>
                <p className="text-muted mt-2">
                    {isPendingTab ? 'No open fraud cases — all clear!' : 'No fraud cases found.'}
                </p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <Table hover className="align-middle mb-0">
                <thead className="table-light">
                    <tr>
                        <th>Case ID</th>
                        <th>Claim ID</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Opened By</th>
                        <th>Opened At</th>
                        {!isPendingTab && <th>Outcome</th>}
                        <th className="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {cases.map(c => {
                        const pStyle = priorityStyle(c.priority);
                        const sStyle = caseStatusStyle(c.status);
                        const isOpen = OPEN_STATUSES.includes(c.status);

                        return (
                            <tr
                                key={c.caseID}
                                style={isPendingTab ? { background: '#fffbf5' } : {}}
                            >
                                <td className="fw-semibold">FC-{c.caseID}</td>
                                <td>CLM-{c.claimID}</td>
                                <td>
                                    <Badge
                                        pill
                                        style={{ background: pStyle.bg, color: pStyle.color, fontSize: '0.78rem' }}
                                    >
                                        <i className={`bi ${priorityIcon(c.priority)} me-1`}></i>
                                        {c.priority}
                                    </Badge>
                                </td>
                                <td>
                                    <Badge
                                        pill
                                        style={{ background: sStyle.bg, color: sStyle.color, fontSize: '0.78rem' }}
                                    >
                                        <i className={`bi ${caseStatusIcon(c.status)} me-1`}></i>
                                        {c.status === 'UnderInvestigation' ? 'Investigating' : c.status}
                                    </Badge>
                                </td>
                                <td>{c.openedByName || '—'}</td>
                                <td>{formatDate(c.openedAt)}</td>
                                {!isPendingTab && (
                                    <td>{c.outcome || '—'}</td>
                                )}
                                <td className="text-end">
                                    <div className="d-flex gap-1 justify-content-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => onViewDetail(c)}
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <i className="bi bi-eye me-1"></i>Details
                                        </Button>
                                        {isOpen && (
                                            <Button
                                                size="sm"
                                                onClick={() => onResolve(c)}
                                                style={{
                                                    borderRadius: '8px',
                                                    background: isPendingTab
                                                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                        : 'transparent',
                                                    border: isPendingTab ? 'none' : '1px solid #e74c3c',
                                                    color: isPendingTab ? '#fff' : '#e74c3c',
                                                }}
                                            >
                                                <i className="bi bi-gavel me-1"></i>Resolve
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}