import { Table, Badge, Button, Spinner } from 'react-bootstrap';
import {
    formatDate, statusStyle, statusIcon,
    outcomeStyle, outcomeIcon, ACTIVE_STATUSES,
} from '../utils/appealHelpers';

export default function AppealsTable({
    appeals, loading, error, isActiveTab,
    isStaff, currentUserId,
    onViewDetail, onDecide, onWithdraw, onRetry,
}) {
    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#667eea' }} />
                <div className="text-muted mt-2">Loading appeals…</div>
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

    if (appeals.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="bi bi-megaphone fs-1" style={{ color: '#667eea' }}></i>
                <p className="text-muted mt-2">
                    {isActiveTab ? 'No active appeals — all caught up!' : 'No appeals found.'}
                </p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <Table hover className="align-middle mb-0">
                <thead>
                    <tr style={{ background: '#f8f9ff' }}>
                        <th>Appeal ID</th>
                        <th>Claim ID</th>
                        <th>Filed By</th>
                        <th>Filed At</th>
                        <th>Status</th>
                        {!isActiveTab && <th>Outcome</th>}
                        <th>Reason</th>
                        <th className="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {appeals.map(a => {
                        const sStyle = statusStyle(a.status);
                        const isActive = ACTIVE_STATUSES.includes(a.status);

                        return (
                            <tr
                                key={a.appealID}
                                style={isActiveTab ? { background: '#f0f4ff' } : {}}
                            >
                                <td className="fw-semibold">APL-{a.appealID}</td>
                                <td>CLM-{a.claimID}</td>
                                <td>{a.filedByName || '—'}</td>
                                <td>{formatDate(a.filedAt)}</td>
                                <td>
                                    <Badge
                                        pill
                                        style={{ background: sStyle.bg, color: sStyle.color, fontSize: '0.78rem' }}
                                    >
                                        <i className={`bi ${statusIcon(a.status)} me-1`}></i>
                                        {a.status === 'UnderReview' ? 'Under Review' : a.status}
                                    </Badge>
                                </td>
                                {!isActiveTab && (
                                    <td>
                                        {a.outcome ? (
                                            <Badge
                                                pill
                                                style={{ ...outcomeStyle(a.outcome), fontSize: '0.78rem' }}
                                            >
                                                <i className={`bi ${outcomeIcon(a.outcome)} me-1`}></i>
                                                {a.outcome}
                                            </Badge>
                                        ) : '—'}
                                    </td>
                                )}
                                <td>
                                    <span className="small text-truncate d-inline-block" style={{ maxWidth: 200 }}>
                                        {a.reason}
                                    </span>
                                </td>
                                <td className="text-end">
                                    <div className="d-flex gap-1 justify-content-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => onViewDetail(a)}
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <i className="bi bi-eye me-1"></i>Details
                                        </Button>
                                        {isStaff && isActive && (
                                            <Button
                                                size="sm"
                                                onClick={() => onDecide(a)}
                                                style={{
                                                    borderRadius: '8px',
                                                    background: isActiveTab
                                                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                                                        : 'transparent',
                                                    border: isActiveTab ? 'none' : '1px solid #667eea',
                                                    color: isActiveTab ? '#fff' : '#667eea',
                                                }}
                                            >
                                                <i className="bi bi-gavel me-1"></i>Decide
                                            </Button>
                                        )}
                                        {!isStaff && isActive && a.filedByName && (
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => onWithdraw(a)}
                                                style={{ borderRadius: '8px' }}
                                            >
                                                <i className="bi bi-x-circle me-1"></i>Withdraw
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