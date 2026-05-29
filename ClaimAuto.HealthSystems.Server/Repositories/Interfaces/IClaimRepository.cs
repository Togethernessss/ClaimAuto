using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IClaimRepository
    {
        // ── CLAIM — READ operations ─────────────────────────────────────

        // Used by: GET /api/claims
        // Returns all claims with optional filters.
        // Role-based: Hospital sees own claims, Policyholder sees own, Staff/Admin see all.
        // userOrgId (Phase 4): when supplied, filters out claims that don't belong to that organization.
        Task<List<ClaimResponseDto>> GetAllClaimsAsync(string? status, string? priority,
    int? userId, string? userRole,
    int? userOrgId = null, int? page = null, int? pageSize = null);

        // Used by: GET /api/claims/{id}
        // Returns full claim detail — lines, documents, adjudication.
        // userOrgId (Phase 4): when supplied, returns null if claim doesn't belong to that organization.
        Task<ClaimDetailResponseDto?> GetClaimByIdAsync(int claimId, int? userOrgId = null);

        // ── CLAIM — WRITE operations ────────────────────────────────────

        // Check if ExternalClaimRef already exists (duplicate detection).
        // userOrgId (Phase 4): when supplied, scopes the uniqueness check to that organization
        //                     — Star and HDFC can both use the same ExternalClaimRef.
        Task<bool> ExternalClaimRefExistsAsync(string externalClaimRef, int? userOrgId = null);

        // Used by: POST /api/claims
        Task<ClaimResponseDto?> SubmitClaimAsync(CreateClaimDto dto, int submittedByUserId, int? userOrgId = null);

        // Used by: PUT /api/claims/{id}
        // Used by: PUT /api/claims/{id}
        // userOrgId (Phase 4): when supplied, returns null if claim doesn't belong to that organization
        //                     (prevents cross-tenant mutation).
        Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, UpdateClaimDto dto, int updatedByUserId, int? userOrgId = null);

        // Used by: DELETE /api/claims/{id}
        // Admin deletes Rejected or Submitted claims.
        // Hospital deletes only their own Submitted claims (before staff review).
        // userOrgId (Phase 4): scopes to caller's org.
        // Returns: "ok", "notfound", "notallowed"
        Task<string> DeleteClaimAsync(int claimId, int deletedByUserId, int? userOrgId = null, bool isHospital = false);

        // ── CLAIM LINES ─────────────────────────────────────────────────

        // Used by: POST /api/claims/{id}/lines
        Task<ClaimLineResponseDto?> AddClaimLineAsync(int claimId, AddClaimLineDto dto, int addedByUserId);

        // Used by: GET /api/claims/{id}/lines
        // userOrgId (Phase 4): when supplied, returns only lines whose org matches the caller.
        Task<List<ClaimLineResponseDto>> GetClaimLinesAsync(int claimId, int? userOrgId = null);

        // ── CLAIM DOCUMENTS ─────────────────────────────────────────────

        // Used by: POST /api/claims/{id}/documents
        Task<ClaimDocumentResponseDto?> UploadDocumentAsync(int claimId, UploadDocumentDto dto,
            int uploadedByUserId);

        // Used by: GET /api/claims/{id}/documents
        // userOrgId (Phase 4): when supplied, returns only documents whose org matches the caller.
        Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId, int? userOrgId = null);

        // Used by: DELETE /api/claims/{id}/documents/{docId}
        // Authorization (ownership + status) enforced in controller before calling this.
        // Returns: "ok", "notfound"
        Task<string> DeleteDocumentAsync(int claimId, int docId, int requestingUserId, int? userOrgId = null);

        // Used by: PUT /api/claims/{id}/documents/{docId}/verify
        // InsuranceStaff/Admin only. Sets DocStatus to Verified or Rejected.
        // Returns: updated DTO, or null if document not found.
        Task<ClaimDocumentResponseDto?> VerifyDocumentAsync(int claimId, int docId, VerifyDocumentDto dto, int verifiedByUserId, int? userOrgId = null);

        // Used by: GET /api/claims/{id} — role-based access control for Policyholder
        // Returns all MemberIDs whose PolicyholderUserID matches the given user.
        // Used to verify a Policyholder is allowed to view a specific claim.
        Task<List<int>> GetMemberIdsByPolicyholderAsync(int policyholderUserId, int? userOrgId);

        // Used by: POST /api/claims/{id}/proceed-to-adjudication
        // Pre-flight validation before staff triggers fraud scoring + adjudication.
        // Returns: "ok" | "notfound" | "wrongstatus" | "pendingdocs"
        Task<string> ValidateProceedToAdjudicationAsync(int claimId, int? userOrgId = null);

        /// <summary>
        /// Staff-initiated rejection of a claim. Sets status to Rejected,
        /// records reason in audit log, and notifies the filer.
        /// Available only on non-finalized claims (Submitted, DocsVerificationPending,
        /// or UnderReview).
        /// </summary>
        Task<string> StaffRejectClaimAsync(int claimId, string reason, int rejectedByUserId, int? userOrgId = null);

        /// <summary>
        /// Replaces a REJECTED document with a corrected version.
        /// Preserves DocID + audit history.
        /// Resets Status to Pending and clears the VerifiedBy field
        /// so staff can review the new version.
        /// </summary>
        Task<ClaimDocumentResponseDto?> ReplaceDocumentAsync(int claimId, int docId, ReplaceDocumentDto dto, int replacedByUserId, int? userOrgId = null);
    }
}