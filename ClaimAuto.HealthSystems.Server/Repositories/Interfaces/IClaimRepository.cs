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
            int? userOrgId = null);

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
        Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, UpdateClaimDto dto, int updatedByUserId);

        // Used by: DELETE /api/claims/{id}
        // Admin deletes a claim — only allowed for Rejected claims.
        // userOrgId (Phase 4): when supplied, returns "notfound" if claim isn't in caller's org
        //                     (prevents cross-tenant deletion).
        // Returns: "ok", "notfound", "notrejected"
        Task<string> DeleteClaimAsync(int claimId, int deletedByUserId, int? userOrgId = null);

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
    }
}