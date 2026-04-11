using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IClaimRepository
    {
        Task<List<Claim>> GetAllAsync();
        Task<Claim?> GetByIdAsync(int id);
        Task<Claim?> GetByIdDetailedAsync(int id);
        Task<List<Claim>> GetByMemberAsync(int memberId);
        Task<List<Claim>> GetByStatusAsync(ClaimStatus status);
        Task<bool> ExternalRefExistsAsync(string externalRef);
        Task CreateClaimWithAuditAsync(Claim claim, AuditLog log);
        Task UpdateStatusAsync(Claim claim, ClaimStatus newStatus);
        Task DeleteAsync(Claim claim);

        // Claim Lines
        Task<List<ClaimLine>> GetLinesByClaimAsync(int claimId);
        Task<ClaimLine?> GetLineAsync(int claimId, int lineId);
        Task AddLineAsync(ClaimLine line);
        Task UpdateLineAsync(ClaimLine line);
        Task DeleteLineAsync(ClaimLine line);

        // Claim Documents
        Task<List<ClaimDocument>> GetDocumentsByClaimAsync(int claimId);
        Task<ClaimDocument?> GetDocumentAsync(int claimId, int docId);
        Task AddDocumentAsync(ClaimDocument doc);
        Task VerifyDocumentAsync(ClaimDocument doc, int verifiedByUserId);
        Task DeleteDocumentAsync(ClaimDocument doc);

        Task SaveChangesAsync();
        Task LoadMemberAsync(Claim claim);
        Task LoadProviderAsync(Claim claim);

    }
}
