using ClaimAuto.HealthSystems.Server.DTOs;
namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPolicyRepository
    {
        Task<List<PolicyResponseDto>> GetAllPoliciesAsync();
        Task<List<PolicyResponseDto>> GetActivePoliciesAsync();
        Task<PolicyResponseDto?> GetPolicyByIdAsync(int policyId);

        // Check if a PlanCode already exists (for duplicate detection)
        Task<bool> PlanCodeExistsAsync(string planCode);
        Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, int createdByUserId);
        Task<PolicyResponseDto?> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto, int updatedByUserId);

        // Soft delete — sets Status to Expired
        // Returns: "ok" on success, "notfound", "alreadyexpired", "hasmembers" for guard failures
        Task<string> DeactivatePolicyAsync(int policyId, int deactivatedByUserId);
    }
}
