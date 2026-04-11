using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IClaimService
    {
        // Claims
        Task<List<ClaimResponseDto>> GetAllAsync();
        Task<ClaimResponseDto?> GetByIdAsync(int id);
        Task<List<ClaimResponseDto>> GetByMemberAsync(int memberId);
        Task<List<ClaimResponseDto>> GetByStatusAsync(ClaimStatus status);
        Task<(bool Success, string Error, ClaimResponseDto? Claim)> SubmitClaimAsync(CreateClaimDto dto, int providerID);
        Task<(bool Success, string Error)> UpdateStatusAsync(int id, ClaimStatus newStatus);
        Task<(bool Success, string Error)> DeleteAsync(int id);

        // Claim Lines
        Task<(bool Success, string Error, List<ClaimLine>? Lines)> GetLinesAsync(int claimId);
        Task<(bool Success, string Error, ClaimLine? Line)> GetLineAsync(int claimId, int lineId);
        Task<(bool Success, string Error, ClaimLine? Line)> AddLineAsync(int claimId, ClaimLine line);
        Task<(bool Success, string Error)> UpdateLineAsync(int claimId, int lineId, ClaimLine updated);
        Task<(bool Success, string Error)> DeleteLineAsync(int claimId, int lineId);

        // Claim Documents
        Task<(bool Success, string Error, List<ClaimDocument>? Docs)> GetDocumentsAsync(int claimId);
        Task<(bool Success, string Error, ClaimDocument? Doc)> GetDocumentAsync(int claimId, int docId);
        Task<(bool Success, string Error, ClaimDocument? Doc)> UploadDocumentAsync(int claimId, ClaimDocument doc);
        Task<(bool Success, string Error)> VerifyDocumentAsync(int claimId, int docId, int verifiedByUserId);
        Task<(bool Success, string Error)> DeleteDocumentAsync(int claimId, int docId);
    }
}