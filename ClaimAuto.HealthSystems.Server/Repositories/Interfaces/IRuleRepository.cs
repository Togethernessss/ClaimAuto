using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IRuleRepository
    {
        // userOrgId (Multi-tenant): when supplied, scopes to that organization's rules.
        Task<List<RuleResponseDto>> GetAllRulesAsync(string? status, string? ruleType, int? userOrgId = null);
        Task<RuleResponseDto?> GetRuleByIdAsync(int ruleId, int? userOrgId = null);
        Task<RuleResponseDto> CreateRuleAsync(CreateRuleDto dto, int createdByUserId, int? userOrgId = null);
        Task<RuleResponseDto?> UpdateRuleAsync(int ruleId, UpdateRuleDto dto, int updatedByUserId);
        Task<string> ActivateRuleAsync(int ruleId, int userId);
        Task<string> DeactivateRuleAsync(int ruleId, int userId);
        Task<string> DeleteRuleAsync(int ruleId, int userId);
    }
}