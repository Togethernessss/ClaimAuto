using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IClaimRepository
    {
        
        Task<List<ClaimResponseDto>> GetAllClaimsAsync(string? status, string? priority,
            int? userId, string? userRole);

        Task<ClaimDetailResponseDto?> GetClaimByIdAsync(int claimId);

       
        Task<bool> ExternalClaimRefExistsAsync(string externalClaimRef);

        
        Task<ClaimResponseDto?> SubmitClaimAsync(CreateClaimDto dto, int submittedByUserId);

        
        Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, UpdateClaimDto dto, int updatedByUserId);


        
        Task<string> DeleteClaimAsync(int claimId, int deletedByUserId);

       
        Task<ClaimLineResponseDto?> AddClaimLineAsync(int claimId, AddClaimLineDto dto, int addedByUserId);

        
        Task<List<ClaimLineResponseDto>> GetClaimLinesAsync(int claimId);

        Task<ClaimDocumentResponseDto?> UploadDocumentAsync(int claimId, UploadDocumentDto dto,
            int uploadedByUserId);

        
        Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId);
    }
}