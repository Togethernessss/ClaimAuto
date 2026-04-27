using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAdjudicationRepository
    {
        Task<AdjudicationResponseDto?> AutoAdjudicateAsync(int claimId);

        Task<AdjudicationResponseDto?> ManualAdjudicateAsync(ManualAdjudicateDto dto, int performedByUserId);

        Task<AdjudicationResponseDto?> GetAdjudicationAsync(int claimId);

        Task<List<RuleTraceDto>?> GetRuleTraceAsync(int claimId);
    }
}