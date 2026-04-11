using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAdjudicationService
    {
        Task<List<AdjudicationRecord>> GetAllAsync();
        Task<List<AdjudicationRecord>> GetByClaimIdAsync(int claimId);
        Task<(bool Success, string Error, AdjudicationRecord? Record)> AutoAdjudicateAsync(int claimId);
        Task<(bool Success, string Error, AdjudicationRecord? Record)> ManualAdjudicateAsync(AdjudicationRecord record);
    }
}