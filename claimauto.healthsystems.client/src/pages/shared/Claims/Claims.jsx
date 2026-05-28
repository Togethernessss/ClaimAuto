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
import ClaimsHeader from './components/ClaimsHeader';
import ClaimsFilters from './components/ClaimsFilters';
import ClaimsSummary from './components/ClaimsSummary';
import ClaimsTable from './components/ClaimsTable';
import SubmitClaimModal from './components/SubmitClaimModal';
import ReimbursementModal from './components/ReimbursementModal';
import ClaimDetailModal from './components/ClaimDetailModal';
import UpdateStatusModal from './components/UpdateStatusModal';
import DeleteClaimModal from './components/DeleteClaimModal';

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

    // ── SUPPORTING DATA ───────────────────────────────────────────────────────
    const [members, setMembers] = useState([]);

    // ── SUBMIT CLAIM MODAL (Hospital) ─────────────────────────────────────────
    const [showSubmit, setShowSubmit] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // ── REIMBURSEMENT MODAL (Policyholder) ────────────────────────────────────
    const [showReimbursement, setShowReimbursement] = useState(false);
    const [reimbursementLoading, setReimbursementLoading] = useState(false);
    const [reimbursementError, setReimbursementError] = useState(null);

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

    // ── FILTERED LIST ─────────────────────────────────────────────────────────
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
        return matchSearch && matchStatus && matchPriority;
    });

    const hasFilters = !!search || statusFilter !== 'All' || priorityFilter !== 'All';

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

            setSuccessMsg(
                `Claim CLM-${claimId} submitted. ` +
                `Insurance staff will verify your documents before processing.`
            );
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to submit claim.';
            setSubmitError(typeof msg === 'string' ? msg : 'Failed to submit claim.');
        } finally {
            setSubmitLoading(false);
        }
    };

    // ── POLICYHOLDER REIMBURSEMENT HANDLERS ───────────────────────────────────
    const handleSubmitReimbursement = async (formData) => {
        setReimbursementError(null);
        setReimbursementLoading(true);
        try {
            const result = await submitClaim(formData);
            const claimId = result?.claim?.claimID ?? result?.claimID;
            setShowReimbursement(false);
            await loadClaims();
            setSuccessMsg(
                `Reimbursement CLM-${claimId} submitted. ` +
                `Attach your bills to speed up processing.`
            );
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data
                || 'Failed to submit reimbursement.';
            setReimbursementError(typeof msg === 'string' ? msg : 'Failed to submit reimbursement.');
        } finally {
            setReimbursementLoading(false);
        }
    };

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
            setSuccessMsg(msg ?? `Claim CLM-${claimId} has been rejected.`);
        } catch (err) {
            const errMsg = err.response?.data?.message
                || err.response?.data
                || 'Failed to reject claim.';
            setProceedError(typeof errMsg === 'string' ? errMsg : 'Failed to reject claim.');
        } finally {
            setProceedLoading(false);
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
                onReimbursementClick={() => {
                    setReimbursementError(null);
                    setShowReimbursement(true);
                }}
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
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onPriorityChange={setPriorityFilter}
            />

            {/* Summary stat cards */}
            {!loading && !error && claims.length > 0 && (
                <ClaimsSummary claims={claims} />
            )}

            {/* Main table */}
            <ClaimsTable
                claims={filtered}
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

            <ReimbursementModal
                show={showReimbursement}
                loading={reimbursementLoading}
                error={reimbursementError}
                members={members}
                userID={user?.userID}
                onHide={() => setShowReimbursement(false)}
                onSubmit={handleSubmitReimbursement}
            />

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
                onReplaceDocument={handleReplaceDocument}    /* ← ADDED */
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

        </Container>
    );
}