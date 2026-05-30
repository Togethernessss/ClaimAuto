using ClaimAuto.HealthSystems.Server.DTOs;
namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPolicyRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's policies.
        Task<List<PolicyResponseDto>> GetAllPoliciesAsync(int? userOrgId = null);
        Task<List<PolicyResponseDto>> GetActivePoliciesAsync(int? userOrgId = null);
        Task<PolicyResponseDto?> GetPolicyByIdAsync(int policyId, int? userOrgId = null);
        Task<bool> PlanCodeExistsAsync(string planCode);
        Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, int createdByUserId, int? userOrgId = null);
        Task<PolicyResponseDto?> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto, int updatedByUserId);
        Task<string> DeactivatePolicyAsync(int policyId, int deactivatedByUserId);
        Task<object> AutoExpirePoliciesAsync();
        // Returns policies that have members belonging to this policyholder.
        Task<List<PolicyResponseDto>> GetPoliciesForPolicyholderAsync(int policyholderUserId, int? userOrgId = null, bool activeOnly = false);
    }
}
