using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class RuleService : IRuleService
    {
        private readonly IRuleRepository _repo;

        public RuleService(IRuleRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<RuleResponseDto>> GetAllAsync()
        {
            var rules = await _repo.GetAllWithCreatorAsync();
            return rules.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, RuleResponseDto? Rule)> GetByIdAsync(int id)
        {
            var rule = await _repo.GetByIdWithCreatorAsync(id);
            if (rule == null)
                return (false, $"Rule with ID {id} not found.", null);

            return (true, "", MapToDto(rule));
        }

        public async Task<List<RuleResponseDto>> GetActiveAsync()
        {
            var rules = await _repo.GetActiveWithCreatorAsync();
            return rules.Select(MapToDto).ToList();
        }

        public async Task<List<RuleResponseDto>> GetByTypeAsync(RuleType ruleType)
        {
            var rules = await _repo.GetByTypeWithCreatorAsync(ruleType);
            return rules.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, RuleResponseDto? Rule)> CreateAsync(CreateRuleDto dto, int currentUserId)
        {
            if (!Enum.TryParse<RuleType>(dto.RuleType, true, out var ruleType))
                return (false, $"Invalid RuleType: {dto.RuleType}", null);

            var rule = new Rule
            {
                Name = dto.Name,
                Description = dto.Description,
                RuleType = ruleType,
                ConditionExpressionJSON = dto.ConditionExpressionJSON,
                ActionExpressionJSON = dto.ActionExpressionJSON,
                Priority = dto.Priority,
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow,
                Status = RuleStatus.Draft
            };

            var log = new AuditLog
            {
                UserID = currentUserId,
                Action = "CreateRule",
                ResourceType = "Rule",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreateRuleWithAuditAsync(rule, log);
            await _repo.LoadCreatorAsync(rule);

            return (true, "", MapToDto(rule));
        }

        public async Task<(bool Success, string Error)> UpdateAsync(int id, UpdateRuleDto dto)
        {
            var rule = await _repo.GetByIdAsync(id);
            if (rule == null)
                return (false, $"Rule with ID {id} not found.");

            if (!Enum.TryParse<RuleType>(dto.RuleType, true, out var ruleType))
                return (false, $"Invalid RuleType: {dto.RuleType}");

            rule.Name = dto.Name;
            rule.Description = dto.Description;
            rule.RuleType = ruleType;
            rule.ConditionExpressionJSON = dto.ConditionExpressionJSON;
            rule.ActionExpressionJSON = dto.ActionExpressionJSON;
            rule.Priority = dto.Priority;
            rule.Version += 1;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> ActivateAsync(int id)
        {
            var rule = await _repo.GetByIdAsync(id);
            if (rule == null)
                return (false, $"Rule with ID {id} not found.");

            rule.Status = RuleStatus.Active;
            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeactivateAsync(int id)
        {
            var rule = await _repo.GetByIdAsync(id);
            if (rule == null)
                return (false, $"Rule with ID {id} not found.");

            rule.Status = RuleStatus.Inactive;
            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var rule = await _repo.GetByIdAsync(id);
            if (rule == null)
                return (false, $"Rule with ID {id} not found.");

            await _repo.DeleteAsync(rule);
            return (true, "");
        }

        private static RuleResponseDto MapToDto(Rule r)
        {
            return new RuleResponseDto
            {
                RuleID = r.RuleID,
                Name = r.Name,
                Description = r.Description,
                RuleType = r.RuleType.ToString(),
                ConditionExpressionJSON = r.ConditionExpressionJSON,
                ActionExpressionJSON = r.ActionExpressionJSON,
                Priority = r.Priority,
                Version = r.Version,
                Status = r.Status.ToString(),
                CreatedBy = r.CreatedBy,
                CreatedByName = r.CreatedByUser?.Name ?? "",
                CreatedAt = r.CreatedAt
            };
        }
    }
}

