using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class RuleRepository : IRuleRepository
    {
        private readonly ApplicationDbContext _db;

        public RuleRepository(ApplicationDbContext db)
        {
            _db = db;
        }


        public async Task<List<RuleResponseDto>> GetAllRulesAsync(string? status, string? ruleType, int? userOrgId = null)
        {
            var query = _db.Rules
                .Include(r => r.CreatedByUser)
                .AsQueryable();

            // ── Multi-tenant filter ──────────────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(r => r.OrganizationID == userOrgId.Value);

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<RuleStatus>(status, true, out var parsedStatus))
                    query = query.Where(r => r.Status == parsedStatus);
            }

            if (!string.IsNullOrEmpty(ruleType))
            {
                // RuleType is now a template-key string (e.g. "PolicyActive","AmountAbove").
                // Match case-insensitively so legacy/casual values from the UI still work.
                query = query.Where(r => r.RuleType.ToLower() == ruleType.ToLower());
            }

            query = query.OrderBy(r => r.Priority);

            return await query
                .Select(r => new RuleResponseDto
                {
                    RuleID = r.RuleID,
                    Name = r.Name,
                    Description = r.Description,
                    RuleType = r.RuleType.ToString(),
                    ConditionExpressionJSON = r.ConditionExpressionJSON,
                    ActionExpressionJSON = r.ActionExpressionJSON,
                    Priority = r.Priority,
                    Version = r.Version,
                    CreatedByName = r.CreatedByUser.Name,
                    CreatedAt = r.CreatedAt,
                    Status = r.Status.ToString()
                })
                .ToListAsync();
        }

        public async Task<RuleResponseDto?> GetRuleByIdAsync(int ruleId, int? userOrgId = null)
        {
            var query = _db.Rules
                .Include(r => r.CreatedByUser)
                .Where(r => r.RuleID == ruleId);

            // ── Multi-tenant ownership check ──────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(r => r.OrganizationID == userOrgId.Value);

            return await query
                .Select(r => new RuleResponseDto
                {
                    RuleID = r.RuleID,
                    Name = r.Name,
                    Description = r.Description,
                    RuleType = r.RuleType.ToString(),
                    ConditionExpressionJSON = r.ConditionExpressionJSON,
                    ActionExpressionJSON = r.ActionExpressionJSON,
                    Priority = r.Priority,
                    Version = r.Version,
                    CreatedByName = r.CreatedByUser.Name,
                    CreatedAt = r.CreatedAt,
                    Status = r.Status.ToString()
                })
                .FirstOrDefaultAsync();
        }

        public async Task<RuleResponseDto> CreateRuleAsync(CreateRuleDto dto, int createdByUserId, int? userOrgId = null)
        {
            // RuleType is now a free-form template-key string (e.g. "PolicyActive",
            // "AmountAbove"). The engine dispatches to a strategy by this key, so we
            // accept whatever the admin/UI sent and let the strategy registry validate it.
            var ruleType = string.IsNullOrWhiteSpace(dto.RuleType)
                ? RuleTemplate.ROUTE_TO_REVIEW   // safe default — routes to manual review
                : dto.RuleType.Trim();

            var rule = new Rule
            {
                Name = dto.Name,
                Description = dto.Description,
                RuleType = ruleType,
                ConditionExpressionJSON = dto.ConditionExpressionJSON,
                ActionExpressionJSON = dto.ActionExpressionJSON,
                Priority = dto.Priority,
                Version = 1,
                Status = RuleStatus.Draft,
                CreatedBy = createdByUserId,
                CreatedAt = DateTime.UtcNow,
                OrganizationID = userOrgId    // ← NEW: rule belongs to creator's org
            };

            _db.Rules.Add(rule);

            var audit = new AuditLog
            {
                UserID = createdByUserId,
                Action = "CreateRule",
                ResourceType = "Rule",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"name\":\"{dto.Name}\"," +
                               $"\"ruleType\":\"{dto.RuleType}\"," +
                               $"\"priority\":{dto.Priority}," +
                               $"\"status\":\"Draft\"}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            audit.ResourceID = rule.RuleID.ToString();
            await _db.SaveChangesAsync();

            var createdByName = await _db.Users
                .Where(u => u.UserID == createdByUserId)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "Unknown";

            return new RuleResponseDto
            {
                RuleID = rule.RuleID,
                Name = rule.Name,
                Description = rule.Description,
                RuleType = rule.RuleType.ToString(),
                ConditionExpressionJSON = rule.ConditionExpressionJSON,
                ActionExpressionJSON = rule.ActionExpressionJSON,
                Priority = rule.Priority,
                Version = rule.Version,
                CreatedByName = createdByName,
                CreatedAt = rule.CreatedAt,
                Status = rule.Status.ToString()
            };
        }

        public async Task<RuleResponseDto?> UpdateRuleAsync(int ruleId, UpdateRuleDto dto, int updatedByUserId)
        {
            var rule = await _db.Rules.FindAsync(ruleId);
            if (rule == null) return null;

            var changes = new List<string>();

            if (!string.IsNullOrEmpty(dto.Name) && dto.Name != rule.Name)
            {
                changes.Add($"Name: '{rule.Name}' → '{dto.Name}'");
                rule.Name = dto.Name;
            }

            if (dto.Description != null && dto.Description != rule.Description)
            {
                changes.Add("Description updated");
                rule.Description = dto.Description;
            }

            if (!string.IsNullOrEmpty(dto.ConditionExpressionJSON)
                && dto.ConditionExpressionJSON != rule.ConditionExpressionJSON)
            {
                changes.Add("ConditionExpressionJSON updated");
                rule.ConditionExpressionJSON = dto.ConditionExpressionJSON;
            }

            if (!string.IsNullOrEmpty(dto.ActionExpressionJSON)
                && dto.ActionExpressionJSON != rule.ActionExpressionJSON)
            {
                changes.Add("ActionExpressionJSON updated");
                rule.ActionExpressionJSON = dto.ActionExpressionJSON;
            }

            if (dto.Priority.HasValue && dto.Priority.Value != rule.Priority)
            {
                changes.Add($"Priority: {rule.Priority} → {dto.Priority.Value}");
                rule.Priority = dto.Priority.Value;
            }

            if (!changes.Any())
            {
                var createdByNameUnchanged = await _db.Users
                    .Where(u => u.UserID == rule.CreatedBy)
                    .Select(u => u.Name)
                    .FirstOrDefaultAsync() ?? "Unknown";

                return new RuleResponseDto
                {
                    RuleID = rule.RuleID,
                    Name = rule.Name,
                    Description = rule.Description,
                    RuleType = rule.RuleType.ToString(),
                    ConditionExpressionJSON = rule.ConditionExpressionJSON,
                    ActionExpressionJSON = rule.ActionExpressionJSON,
                    Priority = rule.Priority,
                    Version = rule.Version,
                    CreatedByName = createdByNameUnchanged,
                    CreatedAt = rule.CreatedAt,
                    Status = rule.Status.ToString()
                };
            }

            rule.Version += 1;

            var audit = new AuditLog
            {
                UserID = updatedByUserId,
                Action = "UpdateRule",
                ResourceType = "Rule",
                ResourceID = ruleId.ToString(),
                DetailsJSON = $"{{\"newVersion\":{rule.Version}," +
                               $"\"changes\":[{string.Join(",", changes.Select(c => $"\"{c}\""))}]}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = rule.OrganizationID,
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            var createdByName = await _db.Users
                .Where(u => u.UserID == rule.CreatedBy)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "Unknown";

            return new RuleResponseDto
            {
                RuleID = rule.RuleID,
                Name = rule.Name,
                Description = rule.Description,
                RuleType = rule.RuleType.ToString(),
                ConditionExpressionJSON = rule.ConditionExpressionJSON,
                ActionExpressionJSON = rule.ActionExpressionJSON,
                Priority = rule.Priority,
                Version = rule.Version,
                CreatedByName = createdByName,
                CreatedAt = rule.CreatedAt,
                Status = rule.Status.ToString()
            };
        }

        public async Task<string> ActivateRuleAsync(int ruleId, int userId)
        {
            var rule = await _db.Rules.FindAsync(ruleId);
            if (rule == null) return "notfound";

            if (rule.Status == RuleStatus.Active) return "alreadyactive";

            rule.Status = RuleStatus.Active;

            var audit = new AuditLog
            {
                UserID = userId,
                Action = "ActivateRule",
                ResourceType = "Rule",
                ResourceID = ruleId.ToString(),
                DetailsJSON = $"{{\"ruleName\":\"{rule.Name}\"," +
                               $"\"version\":{rule.Version}," +
                               $"\"previousStatus\":\"Draft/Inactive\"," +
                               $"\"newStatus\":\"Active\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = rule.OrganizationID,
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return "ok";
        }

        public async Task<string> DeactivateRuleAsync(int ruleId, int userId)
        {
            var rule = await _db.Rules.FindAsync(ruleId);
            if (rule == null) return "notfound";

            if (rule.Status == RuleStatus.Draft) return "isdraft";

            if (rule.Status == RuleStatus.Inactive) return "notactive";

            rule.Status = RuleStatus.Inactive;

            var audit = new AuditLog
            {
                UserID = userId,
                Action = "DeactivateRule",
                ResourceType = "Rule",
                ResourceID = ruleId.ToString(),
                DetailsJSON = $"{{\"ruleName\":\"{rule.Name}\"," +
                               $"\"version\":{rule.Version}," +
                               $"\"previousStatus\":\"Active\"," +
                               $"\"newStatus\":\"Inactive\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = rule.OrganizationID,
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return "ok";
        }

        public async Task<string> DeleteRuleAsync(int ruleId, int userId)
        {
            var rule = await _db.Rules.FindAsync(ruleId);
            if (rule == null) return "notfound";

            if (rule.Status != RuleStatus.Draft) return "notdraft";

            var audit = new AuditLog
            {
                UserID = userId,
                Action = "DeleteRule",
                ResourceType = "Rule",
                ResourceID = ruleId.ToString(),
                DetailsJSON = $"{{\"ruleName\":\"{rule.Name}\"," +
                               $"\"ruleType\":\"{rule.RuleType}\"," +
                               $"\"priority\":{rule.Priority}," +
                               $"\"version\":{rule.Version}," +
                               $"\"status\":\"Draft\"," +
                               $"\"reason\":\"Draft rule permanently deleted\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = rule.OrganizationID,
            };
            _db.AuditLogs.Add(audit);

            _db.Rules.Remove(rule);

            await _db.SaveChangesAsync();

            return "ok";
        }
    }
}
