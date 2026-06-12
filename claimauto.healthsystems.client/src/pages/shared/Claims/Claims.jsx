// src/pages/shared/Claims/Claims.jsx
import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../../security/AuthContext';
import { canAccess } from '../../../security/permissions';
import {
    getAllClaims,
    getClaimById,
    submitClaim,
    updateClaim,
    deleteClaim,
    uploadDocument,
    deleteDocument,
    verifyDocument,
    proceedToAdjudication,
    replaceDocument,                         // ← ADDED
} from '../../../services/claims/claimService';
import { uploadFile } from '../../../services/files/fileService';
import { computeSHA256 } from './utils/claimHelpers';
import { getAllMembers } from '../../../services/members/memberService';
import { manualAdjudicate } from '../../../services/adjudication/adjudicationService';
import ClaimsHeader from './components/ClaimsHeader';
import ClaimsFilters from './components/ClaimsFilters';
import ClaimsSummary from './components/ClaimsSummary';
import ClaimsTable from './components/ClaimsTable';
import SubmitClaimModal from './components/SubmitClaimModal';
// ReimbursementModal removed — Reimbursement claim type no longer exists.
import ClaimDetailModal from './components/ClaimDetailModal';
import UpdateStatusModal from './components/UpdateStatusModal';
import DeleteClaimModal from './components/DeleteClaimModal';
import ManualAdjudicationModal from './components/ManualAdjudicationModal';
import { useSearchParams } from 'react-router-dom';
import { toast, addToast } from '../../../services/toastService';

// ── Pagination ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) result.push('...');
  }
  return result;
}

// ── Policyholder segment definitions ─────────────────────────────────────────
const SEGMENTS = [
    {
        key: 'all',
        label: 'Total Claims',
        icon: 'bi-folder2-open',
        color: '#667eea',
        statuses: null,
    },
    {
        key: 'approved',
        label: 'Approved / Paid',
        icon: 'bi-check-circle-fill',
        color: '#10b981',
        statuses: ['Approved', 'Paid'],
    },
    {
        key: 'inprogress',
        label: 'In Progress',
        icon: 'bi-hourglass-split',
        color: '#f59e0b',
        statuses: ['Submitted', 'DocsVerificationPending', 'UnderReview'],
    },
    {
        key: 'rejected',
        label: 'Rejected',
        icon: 'bi-x-circle-fill',
        color: '#ef4444',
        statuses: ['Rejected'],
    },
];

export default function Claims() {

    // ── PERMISSIONS ───────────────────────────────────────────────────────────
    const { user } = useAuth();
    const isAdmin = canAccess(user?.role, ['Admin']);
    const isStaff = canAccess(user?.role, ['InsuranceStaff']);
    const isHospital = canAccess(user?.role, ['Hospital']);
    const isPolicyholder = canAccess(user?.role, ['Policyholder']);

    // ── LIST STATE ────────────────────────────────────────────────────────────
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // ── FILTER STATE ──────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    // ── SEGMENT FILTER (Policyholder only) ────────────────────────────────────
    const [searchParams] = useSearchParams();
    const [segmentFilter, setSegmentFilter] = useState(() => {
        const s = searchParams.get('status');
        return ['approved', 'inprogress', 'rejected'].includes(s) ? s : 'all';
    });

    const [currentPage, setCurrentPage] = useState(1);

    const handleSegmentChange = (key) => setSegmentFilter(key);

    // ── Summary card click → filter by status ────────────────────────────────
    const handleSummaryCardClick = (statusVal) => {
        // Toggle off if same card clicked again
        setStatusFilter((prev) => (prev === statusVal ? 'All' : statusVal));
        // For Policyholder, also reset segment so the filter applies to all claims
        if (isPolicyholder) setSegmentFilter('all');
    };

    const getSegmentCount = (seg) =>
        seg.statuses
            ? claims.filter((c) => seg.statuses.includes(c.status)).length
            : claims.length;

    // ── SUPPORTING DATA ───────────────────────────────────────────────────────
    const [members, setMembers] = useState([]);

    // ── SUBMIT CLAIM MODAL (Hospital) ─────────────────────────────────────────
    const [showSubmit, setShowSubmit] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Reimbursement modal state removed — Reimbursement claim type no longer exists.

    // ── DETAIL MODAL ──────────────────────────────────────────────────────────
    const [showDetail, setShowDetail] = useState(false);
    const [detailClaim, setDetailClaim] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [proceedLoading, setProceedLoading] = useState(false);
    const [proceedError, setProceedError] = useState(null);

    // ── UPDATE STATUS MODAL ───────────────────────────────────────────────────
    const [showUpdate, setShowUpdate] = useState(false);
    const [updateTarget, setUpdateTarget] = useState(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState(null);

    // ── DELETE MODAL ──────────────────────────────────────────────────────────
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // ── MANUAL ADJUDICATION MODAL (UnderReview claims) ────────────────────────
    const [showManualAdj,   setShowManualAdj]   = useState(false);
    const [manualAdjClaim,  setManualAdjClaim]  = useState(null);
    const [manualAdjLoading, setManualAdjLoading] = useState(false);
    const [manualAdjError,  setManualAdjError]  = useState(null);

    // ── LOAD CLAIMS ───────────────────────────────────────────────────────────
    const loadClaims = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllClaims();
            setClaims(data);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to load claims.';
            setError(typeof msg === 'string' ? msg : 'Failed to load claims.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadClaims(); }, [loadClaims]);

    // ── LOAD SUPPORTING DATA ──────────────────────────────────────────────────
    useEffect(() => {
        if (isHospital) {
            getAllMembers()
                .then(setMembers)
                .catch(() => setMembers([]));
        }
        if (isPolicyholder) {
            getAllMembers()
                .then(setMembers)
                .catch(() => setMembers([]));
        }
    }, [isHospital, isPolicyholder]);

    // ── AUTO-CLEAR SUCCESS MESSAGE ─────────────────────────────────────────
    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(null), 5000);
        return () => clearTimeout(t);
    }, [successMsg]);

    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, priorityFilter, segmentFilter]);

    // ── FILTERED LIST ─────────────────────────────────────────────────────────
    const activeSeg = SEGMENTS.find((s) => s.key === segmentFilter);
    const filtered = claims.filter((c) => {
        const q = search.toLowerCase();
        const matchSearch =
            String(c.claimID).includes(q) ||
            c.memberName?.toLowerCase().includes(q) ||
            c.providerName?.toLowerCase().includes(q) ||
            c.externalClaimRef?.toLowerCase().includes(q) ||
            c.policyName?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchPriority = priorityFilter === 'All' || c.priority === priorityFilter;
        const matchSegment = !activeSeg?.statuses || activeSeg.statuses.includes(c.status);
        return matchSearch && matchStatus && matchPriority && matchSegment;
    });

    const hasFilters = !!search || statusFilter !== 'All' || priorityFilter !== 'All' || segmentFilter !== 'all';

    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safeePage   = Math.min(currentPage, totalPages);
    const startIdx    = (safeePage - 1) * PAGE_SIZE;
    const endIdx      = Math.min(startIdx + PAGE_SIZE, filtered.length);
    const pagedClaims = filtered.slice(startIdx, endIdx);

    // ── HOSPITAL SUBMIT HANDLERS ──────────────────────────────────────────────
    const handleSubmitClaim = async (formData, lines, documents) => {
        setSubmitError(null);
        setSubmitLoading(true);
        try {
            const payload = { ...formData, lines: lines ?? [], documents: documents ?? [] };
            const result = await submitClaim(payload);
            const claimId = result?.claim?.claimID ?? result?.claimID;

            setShowSubmit(false);
            await loadClaims();

            const submitMsg = `Claim CLM-${claimId} submitted. Insurance staff will verify your documents before processing.`;
            setSuccessMsg(submitMsg);
            toast.success(`Claim CLM-${claimId} submitted successfully!`, 'Claim Submitted');

            // ── Hospital: remind about the 1-hour document edit window ──────
            if (isHospital) {
                addToast({
                    type:     'info',
                    title:    '⏱ Document Edit Window Open',
                    message:  `You have 1 hour to upload, replace, or delete documents for CLM-${claimId}. Open the claim → Documents tab to make changes before the window closes.`,
                    duration: 9000,
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const body   = err.response?.data;

            // Normalise message from string body, ProblemDetails JSON, or fallback
            const extractMsg = (b) => {
                if (typeof b === 'string') return b.replace(/^"|"$/g, '').trim(); // strip stray JSON quotes
                if (b && typeof b === 'object') return b.message || b.detail || b.title || null;
                return null;
            };

            let msg;
            if (status === 409) {
                // Backend returns a plain-string body: "A claim with ExternalClaimRef '...' already exists."
                msg = extractMsg(body)
                    || 'A claim with this External Reference number already exists. Please enter a unique External Claim Ref and try again.';
            } else {
                msg = extractMsg(body) || 'Failed to submit claim.';
            }
            setSubmitError(msg);
        } finally {
            setSubmitLoading(false);
        }
    };

    // Policyholder reimbursement handler removed — Reimbursement claim type no longer exists.

    // ── VIEW DETAIL HANDLERS ──────────────────────────────────────────────────
    const openDetail = async (claim) => {
        setDetailClaim(null);
        setUploadError(null);
        setUploadSuccess(null);
        setLoadingDetail(true);
        setShowDetail(true);
        try {
            const detail = await getClaimById(claim.claimID);
            setDetailClaim(detail);
        } catch {
            setDetailClaim(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleUploadDocument = async (claimId, file, docType) => {
        setUploadError(null);
        setUploadSuccess(null);
        setUploadingDoc(true);
        try {
            const { fileUrl } = await uploadFile(file);
            const sha256 = await computeSHA256(file);
            await uploadDocument(claimId, { docType, fileURI: fileUrl, sha256 });
            const refreshed = await getClaimById(claimId);
            setDetailClaim(refreshed);
            setUploadSuccess('Document uploaded successfully.');
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to upload document.';
            setUploadError(typeof msg === 'string' ? msg : 'Failed to upload document.');
        } finally {
            setUploadingDoc(false);
        }
    };

    // ── DOCUMENT REPLACE (RE-UPLOAD) HANDLER ──────────────────────────────────
    // Called by ClaimDetailModal when Hospital/Policyholder clicks the "Re-upload"
    // button on a rejected document. Replaces the file in place — same DocID is
    // preserved, status resets to Pending, and staff is notified to re-review.
    const handleReplaceDocument = async (claimId, docId, file /* , docType */) => {
        setUploadError(null);
        setUploadSuccess(null);
        setUploadingDoc(true);
        try {
            // 1. Upload the new file to storage (same flow as new uploads)
            const { fileUrl } = await uploadFile(file);
            // 2. Compute SHA-256 of new file for tamper detection
            const sha256 = await computeSHA256(file);
            // 3. Call backend to replace the document in place
            await replaceDocument(claimId, docId, { fileURI: fileUrl, sha256 });
            // 4. Refresh detail view
            const refreshed = await getClaimById(claimId);
            setDetailClaim(refreshed);
            setUploadSuccess('Document re-uploaded successfully. Staff will review the new version.');
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to re-upload document.';
            setUploadError(typeof msg === 'string' ? msg : 'Failed to re-upload document.');
        } finally {
            setUploadingDoc(false);
        }
    };

    // ── DOCUMENT DELETE HANDLER ───────────────────────────────────────────────
    const handleDeleteDocument = async (claimId, docId) => {
        try {
            await deleteDocument(claimId, docId);
            const refreshed = await getClaimById(claimId);
            setDetailClaim(refreshed);
        } catch {
            /* deletion error — modal remains open */
        }
    };

    // ── DOCUMENT VERIFY HANDLER ───────────────────────────────────────────────
    const handleVerifyDocument = async (claimId, docId, status) => {
        try {
            await verifyDocument(claimId, docId, status);
            const refreshed = await getClaimById(claimId);
            setDetailClaim(refreshed);
        } catch {
            /* verify error — modal remains open */
        }
    };

    // ── PROCEED TO ADJUDICATION HANDLER ──────────────────────────────────────
    const handleProceedToAdjudication = async (claimId) => {
        setProceedError(null);
        setProceedLoading(true);
        try {
            await proceedToAdjudication(claimId);
            const refreshed = await getClaimById(claimId);
            setDetailClaim(refreshed);
            await loadClaims();
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to proceed to adjudication.';
            setProceedError(typeof msg === 'string' ? msg : 'Failed to proceed to adjudication.');
        } finally {
            setProceedLoading(false);
        }
    };

    // ── REJECT CLAIM HANDLER ──────────────────────────────────────────────────
    // Called by ClaimDetailModal when staff rejects the claim (either via the
    // all-docs-rejected panel button OR the new "Reject Claim" footer button
    // that opens RejectClaimModal). The optional `msg` argument is set when
    // the new flow passes back a success message — we use it for the toast.
    const handleRejectClaim = async (claimId, msg = null) => {
        setProceedError(null);
        setProceedLoading(true);
        try {
            // If the new RejectClaimModal already called the backend, just refresh.
            // Otherwise (old "All Documents Rejected" panel button), call updateClaim.
            if (!msg) {
                await updateClaim(claimId, { status: 'Rejected' });
            }

            setShowDetail(false);
            setDetailClaim(null);
            setProceedError(null);
            await loadClaims();
            const rejectMsg = msg ?? `Claim CLM-${claimId} has been rejected.`;
            setSuccessMsg(rejectMsg);
            toast.warning(`Claim CLM-${claimId} rejected.`, 'Claim Rejected');
        } catch (err) {
            const errMsg = err.response?.data?.message
                || err.response?.data
                || 'Failed to reject claim.';
            setProceedError(typeof errMsg === 'string' ? errMsg : 'Failed to reject claim.');
        } finally {
            setProceedLoading(false);
        }
    };

    // ── MANUAL ADJUDICATION HANDLER ───────────────────────────────────────────
    // Called when staff clicks "Make Decision" on an UnderReview claim.
    // Opens ManualAdjudicationModal pre-loaded with the claim.
    const openManualAdj = (claim) => {
        setManualAdjClaim(claim);
        setManualAdjError(null);
        setShowManualAdj(true);
    };

    const handleManualAdjudicate = async (dto) => {
        setManualAdjError(null);
        setManualAdjLoading(true);
        try {
            await manualAdjudicate(dto);
            setShowManualAdj(false);
            setManualAdjClaim(null);
            // Refresh list and, if the detail modal is still open, refresh it too
            await loadClaims();
            if (showDetail && detailClaim?.claimID === dto.claimID) {
                const refreshed = await import('../../../services/claims/claimService')
                    .then(m => m.getClaimById(dto.claimID));
                setDetailClaim(refreshed);
            }
            const decisionLabel = dto.decision === 'Denied'  ? 'denied'
                                : dto.decision === 'Partial' ? 'partially approved'
                                : 'approved';
            setSuccessMsg(`Claim CLM-${dto.claimID} has been ${decisionLabel}. ${
                dto.decision !== 'Denied' ? 'A payment record has been created.' : 'The provider has been notified.'
            }`);
            toast.success(`CLM-${dto.claimID} ${decisionLabel}.`, 'Decision Recorded');
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to record decision.';
            setManualAdjError(typeof msg === 'string' ? msg : 'Failed to record decision.');
        } finally {
            setManualAdjLoading(false);
        }
    };

    // ── UPDATE STATUS HANDLERS ────────────────────────────────────────────────
    const openUpdate = (claim) => {
        setUpdateTarget(claim);
        setUpdateError(null);
        setShowUpdate(true);
    };

    const handleUpdateClaim = async (dto) => {
        setUpdateError(null);
        setUpdateLoading(true);
        try {
            await updateClaim(updateTarget.claimID, dto);
            setShowUpdate(false);
            await loadClaims();
            setSuccessMsg(`Claim CLM-${updateTarget.claimID} updated successfully.`);
            toast.success(`Claim CLM-${updateTarget.claimID} status updated.`, 'Status Updated');
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to update claim.';
            setUpdateError(typeof msg === 'string' ? msg : 'Failed to update claim.');
        } finally {
            setUpdateLoading(false);
        }
    };

    // ── DELETE HANDLERS ───────────────────────────────────────────────────────
    const openDelete = (claim) => {
        setDeleteTarget(claim);
        setDeleteError(null);
        setShowDelete(true);
    };

    const handleDeleteClaim = async () => {
        setDeleteError(null);
        setDeleteLoading(true);
        try {
            await deleteClaim(deleteTarget.claimID);
            setShowDelete(false);
            await loadClaims();
            setSuccessMsg(`Claim CLM-${deleteTarget.claimID} deleted successfully.`);
            toast.info(`Claim CLM-${deleteTarget.claimID} has been deleted.`, 'Claim Deleted');
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to delete claim.';
            setDeleteError(typeof msg === 'string' ? msg : 'Failed to delete claim.');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <Container fluid>

            {/* Title + action buttons + success toast */}
            <ClaimsHeader
                isAdmin={isAdmin}
                isStaff={isStaff}
                isHospital={isHospital}
                isPolicyholder={isPolicyholder}
                successMsg={successMsg}
                onSubmitClick={() => {
                    setSubmitError(null);
                    setShowSubmit(true);
                }}
                /* onReimbursementClick removed — Reimbursement claim type no longer exists. */
            />

            {/* Search + status + priority filters */}
            <ClaimsFilters
                search={search}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                filteredCount={filtered.length}
                totalCount={claims.length}
                loading={loading}
                isAdmin={isAdmin}
                isStaff={isStaff}
                isPolicyholder={isPolicyholder}
                segmentFilter={segmentFilter}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onPriorityChange={setPriorityFilter}
                onSegmentReset={() => setSegmentFilter('all')}
            />

            {/* Summary stat cards — clickable to filter */}
            {!loading && !error && claims.length > 0 && (
                <ClaimsSummary
                    claims={claims}
                    activeStatus={statusFilter}
                    onCardClick={handleSummaryCardClick}
                />
            )}

            {/* Main table */}
            <ClaimsTable
                claims={pagedClaims}
                loading={loading}
                error={error}
                isAdmin={isAdmin}
                isStaff={isStaff}
                isHospital={isHospital}
                isPolicyholder={isPolicyholder}
                hasFilters={hasFilters}
                onRetry={loadClaims}
                onView={openDetail}
                onUpdateStatus={openUpdate}
                onDelete={openDelete}
            />

            {!loading && !error && totalPages > 1 && (
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 px-1">
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Page <strong>{safeePage}</strong> of <strong>{totalPages}</strong>
                  {' '}·{' '}
                  <strong>{filtered.length}</strong> total record{filtered.length !== 1 ? 's' : ''}
                </div>
                <div className="d-flex align-items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeePage === 1}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === 1 ? '#f8fafc' : 'white', color: safeePage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                    <i className="bi bi-chevron-left me-1"></i>Prev
                  </button>
                  {getPageNumbers(safeePage, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '0.82rem' }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        style={{ width: 36, height: 34, borderRadius: 8, border: safeePage === p ? 'none' : '1px solid #e2e8f0', background: safeePage === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white', color: safeePage === p ? 'white' : '#475569', fontSize: '0.82rem', fontWeight: safeePage === p ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: safeePage === p ? '0 2px 8px rgba(102,126,234,0.35)' : 'none' }}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeePage === totalPages}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: safeePage === totalPages ? '#f8fafc' : 'white', color: safeePage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: safeePage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                    Next<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* ── MODALS ───────────────────────────────────────────────────────── */}

            <SubmitClaimModal
                show={showSubmit}
                loading={submitLoading}
                error={submitError}
                members={members}
                userID={user?.userID}
                onHide={() => setShowSubmit(false)}
                onSubmit={handleSubmitClaim}
            />

            {/* ReimbursementModal removed — Reimbursement claim type no longer exists. */}

            {/* All roles — full claim detail with 4 tabs */}
            <ClaimDetailModal
                show={showDetail}
                claim={detailClaim}
                loadingDetail={loadingDetail}
                uploadingDoc={uploadingDoc}
                uploadError={uploadError}
                uploadSuccess={uploadSuccess}
                proceedLoading={proceedLoading}
                proceedError={proceedError}
                isAdmin={isAdmin}
                isStaff={isStaff}
                isHospital={isHospital}
                isPolicyholder={isPolicyholder}
                currentUserId={user?.userID}
                onHide={() => {
                    setShowDetail(false);
                    setDetailClaim(null);
                    setProceedError(null);
                }}
                onUploadDocument={handleUploadDocument}
                onDeleteDocument={handleDeleteDocument}
                onVerifyDocument={handleVerifyDocument}
                onProceedToAdjudication={handleProceedToAdjudication}
                onRejectClaim={handleRejectClaim}
                onReplaceDocument={handleReplaceDocument}
                onManualAdjudicate={openManualAdj}
            />

            <UpdateStatusModal
                show={showUpdate}
                loading={updateLoading}
                error={updateError}
                claim={updateTarget}
                onHide={() => setShowUpdate(false)}
                onSubmit={handleUpdateClaim}
            />

            <DeleteClaimModal
                show={showDelete}
                loading={deleteLoading}
                error={deleteError}
                claim={deleteTarget}
                onHide={() => setShowDelete(false)}
                onConfirm={handleDeleteClaim}
            />

            {/* Manual Adjudication — Staff/Admin decision for UnderReview claims */}
            <ManualAdjudicationModal
                show={showManualAdj}
                claim={manualAdjClaim}
                loading={manualAdjLoading}
                error={manualAdjError}
                onHide={() => { setShowManualAdj(false); setManualAdjError(null); }}
                onSubmit={handleManualAdjudicate}
            />

        </Container>
    );
}