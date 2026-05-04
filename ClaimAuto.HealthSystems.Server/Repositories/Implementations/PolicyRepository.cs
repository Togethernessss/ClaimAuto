using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class PolicyRepository : IPolicyRepository
    {
        private readonly ApplicationDbContext _db;

        public PolicyRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<PolicyResponseDto>> GetAllPoliciesAsync()
        {
            return await _db.Policies
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    DeductibleAmount = p.DeductibleAmount,
                    OutOfPocketMax = p.OutOfPocketMax,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),

                    MemberCount = _db.Members.Count(mbox => mbox.PolicyID == p.PolicyID)
                }).ToListAsync();
        }

        public async Task<List<PolicyResponseDto>> GetActivePoliciesAsync()
        {
            var today = DateTime.UtcNow;

            return await _db.Policies
                .Where(p =>
                    p.Status == Model.PolicyStatus.Active &&
                    p.EffectiveFrom <= today &&
                    (p.EffectiveTo == null || p.EffectiveTo >= today)
                )
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    DeductibleAmount = p.DeductibleAmount,
                    OutOfPocketMax = p.OutOfPocketMax,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),
                    MemberCount = _db.Members.Count(m => m.PolicyID == p.PolicyID)
                })
                .ToListAsync();
        }

        public async Task<PolicyResponseDto?> GetPolicyByIdAsync(int policyId)
        {
            return await _db.Policies
                .Where(p => p.PolicyID == policyId)
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    DeductibleAmount = p.DeductibleAmount,
                    OutOfPocketMax = p.OutOfPocketMax,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),

                    MemberCount = _db.Members.Count(m => m.PolicyID == p.PolicyID)
                })
                .FirstOrDefaultAsync();
        }

        // ── CHECK IF PLANCODE EXISTS
        public async Task<bool> PlanCodeExistsAsync(string planCode)
        {
            return await _db.Policies
                .AnyAsync(p => p.PlanCode == planCode);
        }

        public async Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, int createdByUserId)
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

            _db.Policies.Add(policy);

            var audit = new AuditLog
            {
                UserID = createdByUserId,          
                Action = "CreatePolicy",
                ResourceType = "Policy",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"planCode\":\"{dto.PlanCode}\",\"planName\":\"{dto.PlanName}\"}}",
                Timestamp = DateTime.UtcNow
            };

            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            audit.ResourceID = policy.PolicyID.ToString();
            await _db.SaveChangesAsync();

            return new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode ?? string.Empty,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                DeductibleAmount = policy.DeductibleAmount,
                OutOfPocketMax = policy.OutOfPocketMax,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = 0   
            };
        }

        public async Task<PolicyResponseDto?> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto, int updatedByUserId)
        {
            var policy = await _db.Policies.FindAsync(policyId);
            if (policy == null) return null;

            var changes = new List<string>();

            if (dto.PlanName != null && dto.PlanName != policy.PlanName)
            {
                changes.Add($"PlanName: '{policy.PlanName}' → '{dto.PlanName}'");
                policy.PlanName = dto.PlanName;
            }

            if (dto.CoverageRulesJSON != null)
            {
                changes.Add("CoverageRulesJSON updated");
                policy.CoverageRulesJSON = dto.CoverageRulesJSON;
            }

            if (dto.DeductibleAmount.HasValue && dto.DeductibleAmount != policy.DeductibleAmount)
            {
                changes.Add($"DeductibleAmount: {policy.DeductibleAmount} → {dto.DeductibleAmount}");
                policy.DeductibleAmount = dto.DeductibleAmount;
            }

            if (dto.OutOfPocketMax.HasValue && dto.OutOfPocketMax != policy.OutOfPocketMax)
            {
                changes.Add($"OutOfPocketMax: {policy.OutOfPocketMax} → {dto.OutOfPocketMax}");
                policy.OutOfPocketMax = dto.OutOfPocketMax;
            }

            if (dto.EffectiveTo.HasValue && dto.EffectiveTo != policy.EffectiveTo)
            {
                changes.Add($"EffectiveTo: {policy.EffectiveTo} → {dto.EffectiveTo}");
                policy.EffectiveTo = dto.EffectiveTo;
            }
            if (dto.Status != null)
            {
                if (Enum.TryParse<PolicyStatus>(dto.Status, out var newStatus) && newStatus != policy.Status)
                {
                    changes.Add($"Status: '{policy.Status}' → '{dto.Status}'");
                    policy.Status = newStatus;
                }
            }
            if (!changes.Any())
            {
                return new PolicyResponseDto
                {
                    PolicyID = policy.PolicyID,
                    PlanCode = policy.PlanCode ?? string.Empty,
                    PlanName = policy.PlanName,
                    CoverageRulesJSON = policy.CoverageRulesJSON,
                    DeductibleAmount = policy.DeductibleAmount,
                    OutOfPocketMax = policy.OutOfPocketMax,
                    EffectiveFrom = policy.EffectiveFrom,
                    EffectiveTo = policy.EffectiveTo,
                    Status = policy.Status.ToString(),
                    MemberCount = _db.Members.Count(m => m.PolicyID == policy.PolicyID)
                };
            }

            var audit = new AuditLog
            {
                UserID = updatedByUserId,
                Action = "UpdatePolicy",
                ResourceType = "Policy",
                ResourceID = policyId.ToString(),
                DetailsJSON = $"{{\"changes\": [{string.Join(", ", changes.Select(c => $"\"{c}\""))}]}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode ?? string.Empty,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                DeductibleAmount = policy.DeductibleAmount,
                OutOfPocketMax = policy.OutOfPocketMax,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = _db.Members.Count(m => m.PolicyID == policy.PolicyID)
            };
        }

        public async Task<string> DeactivatePolicyAsync(int policyId, int deactivatedByUserId)
        {
            var policy = await _db.Policies.FindAsync(policyId);
            if (policy == null) return "notfound";

            if (policy.Status == PolicyStatus.Expired)
                return "alreadyexpired";

            var hasActiveMembers = await _db.Members
                .AnyAsync(m => m.PolicyID == policyId
                            && m.Status == MemberStatus.Active);

            if (hasActiveMembers) return "hasmembers";

            policy.Status = PolicyStatus.Expired;

            var audit = new AuditLog
            {
                UserID = deactivatedByUserId,
                Action = "DeactivatePolicy",
                ResourceType = "Policy",
                ResourceID = policyId.ToString(),
                DetailsJSON = $"{{\"planCode\":\"{policy.PlanCode}\"," +
                               $"\"reason\":\"Soft deleted — Status set to Expired\"}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return "ok";
        }
    }
}
