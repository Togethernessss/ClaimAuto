using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IRuleRepository
    {
        Task<List<RuleResponseDto>> GetAllRulesAsync(string? status, string? ruleType);

        Task<RuleResponseDto?> GetRuleByIdAsync(int ruleId);

        Task<RuleResponseDto> CreateRuleAsync(CreateRuleDto dto, int createdByUserId);

        Task<RuleResponseDto?> UpdateRuleAsync(int ruleId, UpdateRuleDto dto, int updatedByUserId);

        Task<string> ActivateRuleAsync(int ruleId, int userId);

        Task<string> DeactivateRuleAsync(int ruleId, int userId);

        Task<string> DeleteRuleAsync(int ruleId, int userId);


    }
}
