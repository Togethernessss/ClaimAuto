using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IRuleService
    {
        Task<List<RuleResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, RuleResponseDto? Rule)> GetByIdAsync(int id);
        Task<List<RuleResponseDto>> GetActiveAsync();
        Task<List<RuleResponseDto>> GetByTypeAsync(RuleType ruleType);
        Task<(bool Success, string Error, RuleResponseDto? Rule)> CreateAsync(CreateRuleDto dto, int currentUserId);
        Task<(bool Success, string Error)> UpdateAsync(int id, UpdateRuleDto dto);
        Task<(bool Success, string Error)> ActivateAsync(int id);
        Task<(bool Success, string Error)> DeactivateAsync(int id);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}
