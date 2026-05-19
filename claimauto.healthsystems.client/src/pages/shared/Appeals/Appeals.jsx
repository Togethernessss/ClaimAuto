import { useState, useEffect, useCallback } from 'react';
import { Card, Nav, Button } from 'react-bootstrap';
import { getAllAppeals } from '../../../services/appeals/appealService';
import { useAuth } from '../../../security/AuthContext';
import { ACTIVE_STATUSES } from './utils/appealHelpers';

import AppealsHeader from './components/AppealsHeader';
import AppealsFilters from './components/AppealsFilters';
import AppealsSummary from './components/AppealsSummary';
import AppealsTable from './components/AppealsTable';
import FileAppealModal from './components/FileAppealModal';
import AppealDetailModal from './components/AppealDetailModal';
import DecideAppealModal from './components/DecideAppealModal';
import WithdrawAppealModal from './components/WithdrawAppealModal';

export default function Appeals() {
    const { user } = useAuth();
    const role = user?.role || '';
    const isStaff = role === 'Admin' || role === 'InsuranceStaff';
    const canFile = role === 'Policyholder' || role === 'Hospital';

    // ─── Data ───────────────────────────────────────────
    const [appeals, setAppeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ─── Tabs & Filters ────────────────────────────────
    const [activeTab, setActiveTab] = useState('active');
    const [search, setSearch] = useState('');

    // ─── Messages ──────────────────────────────────────
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // ─── Modals ────────────────────────────────────────
    const [showFileModal, setShowFileModal] = useState(false);
    const [detailAppeal, setDetailAppeal] = useState(null);
    const [decideAppeal, setDecideAppeal] = useState(null);
    const [withdrawAppeal, setWithdrawAppeal] = useState(null);

    // ─── Fetch ─────────────────────────────────────────
    const fetchAppeals = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllAppeals();
            setAppeals(data);
        } catch {
            setError('Failed to load appeals.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAppeals(); }, [fetchAppeals]);

    // ─── Auto-clear messages ──────────────────────────
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(''), 5000);
            return () => clearTimeout(t);
        }
    }, [successMsg]);

    useEffect(() => {
        if (errorMsg) {
            const t = setTimeout(() => setErrorMsg(''), 5000);
            return () => clearTimeout(t);
        }
    }, [errorMsg]);

    // ─── Filter logic ─────────────────────────────────
    const tabAppeals = activeTab === 'active'
        ? appeals.filter(a => ACTIVE_STATUSES.includes(a.status))
        : appeals;

    const filtered = tabAppeals.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            String(a.appealID).includes(q) ||
            String(a.claimID).includes(q) ||
            (a.filedByName || '').toLowerCase().includes(q) ||
            (a.reason || '').toLowerCase().includes(q)
        );
    });

    // ─── Handlers ─────────────────────────────────────
    function handleFiled(msg) {
        setSuccessMsg(msg);
        fetchAppeals();
    }

    function handleDecided(msg) {
        setSuccessMsg(msg);
        fetchAppeals();
    }

    function handleWithdrawn(msg) {
        setSuccessMsg(msg);
        fetchAppeals();
    }

    return (
        <div className="p-4" style={{ maxWidth: 1400, margin: '0 auto' }}>
            <AppealsHeader
                onFileAppeal={() => setShowFileModal(true)}
                canFile={canFile}
                successMsg={successMsg}
                errorMsg={errorMsg}
            />

            <AppealsSummary appeals={appeals} />

            {/* Tab Navigation */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: '14px' }}>
                <Card.Header className="bg-white border-0 pt-3 px-3 pb-0">
                    <Nav variant="tabs" className="border-0">
                        <Nav.Item>
                            <Nav.Link
                                active={activeTab === 'active'}
                                onClick={() => setActiveTab('active')}
                                style={activeTab === 'active'
                                    ? { color: '#667eea', borderColor: '#667eea', fontWeight: 600 }
                                    : { color: '#6c757d' }
                                }
                            >
                                <i className="bi bi-hourglass-split me-1"></i>
                                Active Appeals
                                <span
                                    className="ms-2 badge rounded-pill"
                                    style={{
                                        background: activeTab === 'active' ? '#667eea' : '#dee2e6',
                                        color: activeTab === 'active' ? '#fff' : '#666',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    {appeals.filter(a => ACTIVE_STATUSES.includes(a.status)).length}
                                </span>
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                active={activeTab === 'all'}
                                onClick={() => setActiveTab('all')}
                                style={activeTab === 'all'
                                    ? { color: '#667eea', borderColor: '#667eea', fontWeight: 600 }
                                    : { color: '#6c757d' }
                                }
                            >
                                <i className="bi bi-collection me-1"></i>
                                All Appeals
                                <span
                                    className="ms-2 badge rounded-pill"
                                    style={{
                                        background: activeTab === 'all' ? '#667eea' : '#dee2e6',
                                        color: activeTab === 'all' ? '#fff' : '#666',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    {appeals.length}
                                </span>
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Card.Header>

                <Card.Body className="px-3 pb-3">
                    <AppealsFilters
                        search={search}
                        onSearchChange={setSearch}
                        total={tabAppeals.length}
                        filtered={filtered.length}
                    />

                    <AppealsTable
                        appeals={filtered}
                        loading={loading}
                        error={error}
                        isActiveTab={activeTab === 'active'}
                        isStaff={isStaff}
                        currentUserId={user?.userID}
                        onViewDetail={a => setDetailAppeal(a)}
                        onDecide={a => setDecideAppeal(a)}
                        onWithdraw={a => setWithdrawAppeal(a)}
                        onRetry={fetchAppeals}
                    />
                </Card.Body>
            </Card>

            {/* ─── Modals ─── */}
            <FileAppealModal
                show={showFileModal}
                onHide={() => setShowFileModal(false)}
                onFiled={handleFiled}
            />

            <AppealDetailModal
                show={!!detailAppeal}
                onHide={() => setDetailAppeal(null)}
                appeal={detailAppeal}
            />

            <DecideAppealModal
                show={!!decideAppeal}
                onHide={() => setDecideAppeal(null)}
                appeal={decideAppeal}
                onDecided={handleDecided}
            />

            <WithdrawAppealModal
                show={!!withdrawAppeal}
                onHide={() => setWithdrawAppeal(null)}
                appeal={withdrawAppeal}
                onWithdrawn={handleWithdrawn}
            />
        </div>
    );
}