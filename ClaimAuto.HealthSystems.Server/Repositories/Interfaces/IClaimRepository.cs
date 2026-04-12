using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IClaimRepository
    {
        // ── CLAIM — READ operations ─────────────────────────────────────

        // Used by: GET /api/claims
        // Returns all claims with optional filters
        // Role-based: Hospital sees own claims, Policyholder sees own, Staff/Admin see all
        Task<List<ClaimResponseDto>> GetAllClaimsAsync(string? status, string? priority,
            int? userId, string? userRole);

        // Used by: GET /api/claims/{id}
        // Returns full claim detail — lines, documents, adjudication
        Task<ClaimDetailResponseDto?> GetClaimByIdAsync(int claimId);

        // ── CLAIM — WRITE operations ────────────────────────────────────

        // Check if ExternalClaimRef already exists (duplicate detection)
        Task<bool> ExternalClaimRefExistsAsync(string externalClaimRef);

        // Used by: POST /api/claims
        // Hospital submits a new claim
        // Validates: ProviderID, MemberID, PolicyID must exist
        // Returns null if validation fails
        Task<ClaimResponseDto?> SubmitClaimAsync(CreateClaimDto dto, int submittedByUserId);

        // Used by: PUT /api/claims/{id}
        // Staff updates claim status or priority
        // Returns null if claim not found
        Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, CreateClaimDto dto, int updatedByUserId);

        // Used by: DELETE /api/claims/{id}
        // Admin deletes a claim — only allowed for Rejected claims
        // Returns: "ok", "notfound", "notrejected"
        Task<string> DeleteClaimAsync(int claimId, int deletedByUserId);

        // ── CLAIM LINES ─────────────────────────────────────────────────

        // Used by: POST /api/claims/{id}/lines
        // Adds a line item to an existing claim
        // Returns null if claim not found
        Task<ClaimLineResponseDto?> AddClaimLineAsync(int claimId, AddClaimLineDto dto);

        // Used by: GET /api/claims/{id}/lines
        // Returns all line items for a claim
        Task<List<ClaimLineResponseDto>> GetClaimLinesAsync(int claimId);

        // ── CLAIM DOCUMENTS ─────────────────────────────────────────────

        // Used by: POST /api/claims/{id}/documents
        // Uploads a supporting document (invoice, medical record, lab report)
        // Returns null if claim not found
        Task<ClaimDocumentResponseDto?> UploadDocumentAsync(int claimId, UploadDocumentDto dto,
            int uploadedByUserId);

        // Used by: GET /api/claims/{id}/documents
        // Returns all documents for a claim
        Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId);
    }
}