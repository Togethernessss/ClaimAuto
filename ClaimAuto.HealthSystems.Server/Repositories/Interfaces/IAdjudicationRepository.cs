using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAdjudicationRepository
    {
        // userOrgId (Multi-tenant): when supplied, validates that the claim belongs to that org
        // before adjudicating. Returns null if the claim isn't in the user's tenant.
        Task<AdjudicationResponseDto?> AutoAdjudicateAsync(int claimId, int? userOrgId = null);
        Task<AdjudicationResponseDto?> ManualAdjudicateAsync(ManualAdjudicateDto dto, int performedByUserId, int? userOrgId = null);
        Task<AdjudicationResponseDto?> GetAdjudicationAsync(int claimId, int? userOrgId = null);
        Task<List<RuleTraceDto>?> GetRuleTraceAsync(int claimId, int? userOrgId = null);
    }
}