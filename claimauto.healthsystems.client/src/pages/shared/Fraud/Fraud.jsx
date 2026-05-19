import { useState, useEffect, useCallback } from 'react';
import { Card, Nav, Button } from 'react-bootstrap';
import { getAllFraudCases } from '../../../services/fraud/fraudService';
import { OPEN_STATUSES } from './utils/fraudHelpers';

import FraudHeader from './components/FraudHeader';
import FraudFilters from './components/FraudFilters';
import FraudSummary from './components/FraudSummary';
import FraudCasesTable from './components/FraudCasesTable';
import ScoreClaimModal from './components/ScoreClaimModal';
import OpenCaseModal from './components/OpenCaseModal';
import CaseDetailModal from './components/CaseDetailModal';
import ResolveCaseModal from './components/ResolveCaseModal';

export default function Fraud() {
    // ─── Data ───────────────────────────────────────────
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ─── Tabs & Filters ────────────────────────────────
    const [activeTab, setActiveTab] = useState('open');
    const [search, setSearch] = useState('');
    const [priority, setPriority] = useState('');

    // ─── Messages ──────────────────────────────────────
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // ─── Modals ────────────────────────────────────────
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [detailCase, setDetailCase] = useState(null);
    const [resolveCase, setResolveCase] = useState(null);

    // ─── Fetch Cases ───────────────────────────────────
    const fetchCases = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllFraudCases();
            setCases(data);
        } catch (err) {
            setError('Failed to load fraud cases.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCases(); }, [fetchCases]);

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
    const tabCases = activeTab === 'open'
        ? cases.filter(c => OPEN_STATUSES.includes(c.status))
        : cases;

    const filtered = tabCases.filter(c => {
        const matchSearch = !search ||
            String(c.caseID).includes(search) ||
            String(c.claimID).includes(search) ||
            (c.openedByName || '').toLowerCase().includes(search.toLowerCase());
        const matchPriority = !priority || c.priority === priority;
        return matchSearch && matchPriority;
    });

    // ─── Handlers ─────────────────────────────────────
    function handleScored() {
        setSuccessMsg('Fraud score calculated successfully.');
        fetchCases();
    }

    function handleCaseCreated(msg) {
        setSuccessMsg(msg);
        fetchCases();
    }

    function handleCaseResolved(msg) {
        setSuccessMsg(msg);
        fetchCases();
    }

    return (
        <div className="p-4" style={{ maxWidth: 1400, margin: '0 auto' }}>
            <FraudHeader
                onScoreClaim={() => setShowScoreModal(true)}
                successMsg={successMsg}
                errorMsg={errorMsg}
            />

            <FraudSummary cases={cases} />

            {/* Tab Navigation */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: '14px' }}>
                <Card.Header className="bg-white border-0 pt-3 px-3 pb-0">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <Nav variant="tabs" className="border-0">
                            <Nav.Item>
                                <Nav.Link
                                    active={activeTab === 'open'}
                                    onClick={() => setActiveTab('open')}
                                    style={activeTab === 'open'
                                        ? { color: '#667eea', borderColor: '#667eea', fontWeight: 600 }
                                        : { color: '#6c757d' }
                                    }
                                >
                                    <i className="bi bi-folder2-open me-1"></i>
                                    Open Cases
                                    <span
                                        className="ms-2 badge rounded-pill"
                                        style={{
                                            background: activeTab === 'open' ? '#667eea' : '#dee2e6',
                                            color: activeTab === 'open' ? '#fff' : '#666',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {cases.filter(c => OPEN_STATUSES.includes(c.status)).length}
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
                                    All Cases
                                    <span
                                        className="ms-2 badge rounded-pill"
                                        style={{
                                            background: activeTab === 'all' ? '#667eea' : '#dee2e6',
                                            color: activeTab === 'all' ? '#fff' : '#666',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {cases.length}
                                    </span>
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setShowOpenModal(true)}
                            style={{ borderRadius: '10px' }}
                        >
                            <i className="bi bi-folder-plus me-1"></i>Open Case Manually
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body className="px-3 pb-3">
                    <FraudFilters
                        search={search}
                        onSearchChange={setSearch}
                        priority={priority}
                        onPriorityChange={setPriority}
                        total={tabCases.length}
                        filtered={filtered.length}
                    />

                    <FraudCasesTable
                        cases={filtered}
                        loading={loading}
                        error={error}
                        isPendingTab={activeTab === 'open'}
                        onViewDetail={c => setDetailCase(c)}
                        onResolve={c => setResolveCase(c)}
                        onRetry={fetchCases}
                    />
                </Card.Body>
            </Card>

            {/* ─── Modals ─── */}
            <ScoreClaimModal
                show={showScoreModal}
                onHide={() => setShowScoreModal(false)}
                onScored={handleScored}
            />

            <OpenCaseModal
                show={showOpenModal}
                onHide={() => setShowOpenModal(false)}
                onCreated={handleCaseCreated}
            />

            <CaseDetailModal
                show={!!detailCase}
                onHide={() => setDetailCase(null)}
                fraudCase={detailCase}
            />

            <ResolveCaseModal
                show={!!resolveCase}
                onHide={() => setResolveCase(null)}
                fraudCase={resolveCase}
                onResolved={handleCaseResolved}
            />
        </div>
    );
}
