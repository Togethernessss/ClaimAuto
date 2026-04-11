using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class PolicyService : IPolicyService
    {
        private readonly IPolicyRepository _repo;

        public PolicyService(IPolicyRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<PolicyResponseDto>> GetAllAsync()
        {
            var policies = await _repo.GetAllWithMembersAsync();
            return policies.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, PolicyResponseDto? Policy)> GetByIdAsync(int id)
        {
            var policy = await _repo.GetByIdWithMembersAsync(id);
            if (policy == null)
                return (false, $"Policy with ID {id} not found.", null);

            return (true, "", MapToDto(policy));
        }

        public async Task<List<PolicyResponseDto>> GetActiveAsync()
        {
            var policies = await _repo.GetActiveWithMembersAsync();
            return policies.Select(MapToDto).ToList();
        }

        public async Task<PolicyResponseDto> CreateAsync(CreatePolicyDto dto)
        {
            var policy = new Policy
            {
                PlanCode = dto.PlanCode,
                PlanName = dto.PlanName,
                CoverageRulesJSON = dto.CoverageRulesJSON,
                DeductibleAmount = dto.DeductibleAmount,
                OutOfPocketMax = dto.OutOfPocketMax,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                Status = PolicyStatus.Active
            };

            await _repo.CreateAsync(policy);

            var response = MapToDto(policy);
            response.MemberCount = 0;
            return response;
        }

        public async Task<(bool Success, string Error)> UpdateAsync(int id, UpdatePolicyDto dto)
        {
            var policy = await _repo.GetByIdWithMembersAsync(id);
            if (policy == null)
                return (false, $"Policy with ID {id} not found.");

            if (!Enum.TryParse<PolicyStatus>(dto.Status, true, out var status))
                return (false, $"Invalid Status: {dto.Status}. Valid: Active, Expired, Suspended");

            policy.PlanName = dto.PlanName;
            policy.CoverageRulesJSON = dto.CoverageRulesJSON;
            policy.DeductibleAmount = dto.DeductibleAmount;
            policy.OutOfPocketMax = dto.OutOfPocketMax;
            policy.EffectiveTo = dto.EffectiveTo;
            policy.Status = status;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var policy = await _repo.GetByIdWithMembersAsync(id);
            if (policy == null)
                return (false, $"Policy with ID {id} not found.");

            await _repo.DeleteAsync(policy);
            return (true, "");
        }

        private static PolicyResponseDto MapToDto(Policy p)
        {
            return new PolicyResponseDto
            {
                PolicyID = p.PolicyID,
                PlanCode = p.PlanCode,
                PlanName = p.PlanName,
                CoverageRulesJSON = p.CoverageRulesJSON,
                DeductibleAmount = p.DeductibleAmount,
                OutOfPocketMax = p.OutOfPocketMax,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                Status = p.Status.ToString(),
                MemberCount = p.Members?.Count ?? 0
            };
        }
    }
}