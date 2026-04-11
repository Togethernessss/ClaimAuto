using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IAdjudicationRepository
    {
        Task<List<AdjudicationRecord>> GetAllWithDetailsAsync();
        Task<List<AdjudicationRecord>> GetByClaimIdAsync(int claimId);
        Task<Claim?> GetClaimWithDetailsAsync(int claimId);
        Task<List<Rule>> GetActiveRulesAsync();
        Task<bool> IsDuplicateClaimAsync(int memberId, decimal amount, int claimId);
        Task AutoAdjudicateAsync(AdjudicationRecord record, Claim claim, AuditLog log);
        Task ManualAdjudicateAsync(AdjudicationRecord record, Claim claim, AuditLog log);
    }
}
