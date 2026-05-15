using ClaimAuto.HealthSystems.Server.DTOs;
namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPolicyRepository
    {
        Task<List<PolicyResponseDto>> GetAllPoliciesAsync();
        Task<List<PolicyResponseDto>> GetActivePoliciesAsync();
        Task<PolicyResponseDto?> GetPolicyByIdAsync(int policyId);
        Task<bool> PlanCodeExistsAsync(string planCode);
        Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, int createdByUserId);
        Task<PolicyResponseDto?> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto, int updatedByUserId);
        Task<string> DeactivatePolicyAsync(int policyId, int deactivatedByUserId);
        Task<object> AutoExpirePoliciesAsync();
    }
}