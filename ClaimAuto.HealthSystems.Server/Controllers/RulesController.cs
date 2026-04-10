using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]  // ← Only Admin manages rules
    public class RulesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RulesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/rules
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetAllRules()
        {
            var rules = await _context.Rules
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            var response = rules.Select(r => new RuleResponseDto
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
            });

            return Ok(response);
        }

        // GET: api/rules/5
        [HttpGet("{id}")]
        public async Task<ActionResult<RuleResponseDto>> GetRule(int id)
        {
            var rule = await _context.Rules
                .Include(r => r.CreatedByUser)
                .FirstOrDefaultAsync(r => r.RuleID == id);

            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            var response = new RuleResponseDto
            {
                RuleID = rule.RuleID,
                Name = rule.Name,
                Description = rule.Description,
                RuleType = rule.RuleType.ToString(),
                ConditionExpressionJSON = rule.ConditionExpressionJSON,
                ActionExpressionJSON = rule.ActionExpressionJSON,
                Priority = rule.Priority,
                Version = rule.Version,
                Status = rule.Status.ToString(),
                CreatedBy = rule.CreatedBy,
                CreatedByName = rule.CreatedByUser?.Name ?? "",
                CreatedAt = rule.CreatedAt
            };

            return Ok(response);
        }

        // GET: api/rules/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetActiveRules()
        {
            var rules = await _context.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            var response = rules.Select(r => new RuleResponseDto
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
            });

            return Ok(response);
        }

        // GET: api/rules/type/Coverage
        [HttpGet("type/{ruleType}")]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetRulesByType(RuleType ruleType)
        {
            var rules = await _context.Rules
                .Where(r => r.RuleType == ruleType)
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            var response = rules.Select(r => new RuleResponseDto
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
            });

            return Ok(response);
        }

        // POST: api/rules
        [HttpPost]
        public async Task<ActionResult<RuleResponseDto>> CreateRule(CreateRuleDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int currentUserId = int.Parse(userIdClaim!.Value);

            if (!Enum.TryParse<RuleType>(dto.RuleType, true, out var ruleType))
                return BadRequest($"Invalid RuleType: {dto.RuleType}");

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

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Rules.Add(rule);
                await _context.SaveChangesAsync();

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = currentUserId,
                    Action = "CreateRule",
                    ResourceType = "Rule",
                    ResourceID = rule.RuleID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            await _context.Entry(rule).Reference(r => r.CreatedByUser).LoadAsync();

            var response = new RuleResponseDto
            {
                RuleID = rule.RuleID,
                Name = rule.Name,
                Description = rule.Description,
                RuleType = rule.RuleType.ToString(),
                ConditionExpressionJSON = rule.ConditionExpressionJSON,
                ActionExpressionJSON = rule.ActionExpressionJSON,
                Priority = rule.Priority,
                Version = rule.Version,
                Status = rule.Status.ToString(),
                CreatedBy = rule.CreatedBy,
                CreatedByName = rule.CreatedByUser?.Name ?? "",
                CreatedAt = rule.CreatedAt
            };

            return CreatedAtAction(nameof(GetRule), new { id = rule.RuleID }, response);
        }

        // PUT: api/rules/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id, UpdateRuleDto dto)
        {
            var rule = await _context.Rules.FindAsync(id);
            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            if (!Enum.TryParse<RuleType>(dto.RuleType, true, out var ruleType))
                return BadRequest($"Invalid RuleType: {dto.RuleType}");

            rule.Name = dto.Name;
            rule.Description = dto.Description;
            rule.RuleType = ruleType;
            rule.ConditionExpressionJSON = dto.ConditionExpressionJSON;
            rule.ActionExpressionJSON = dto.ActionExpressionJSON;
            rule.Priority = dto.Priority;
            rule.Version += 1;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/rules/5/activate
        [HttpPut("{id}/activate")]
        public async Task<IActionResult> ActivateRule(int id)
        {
            var rule = await _context.Rules.FindAsync(id);
            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            rule.Status = RuleStatus.Active;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/rules/5/deactivate
        [HttpPut("{id}/deactivate")]
        public async Task<IActionResult> DeactivateRule(int id)
        {
            var rule = await _context.Rules.FindAsync(id);
            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            rule.Status = RuleStatus.Inactive;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/rules/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var rule = await _context.Rules.FindAsync(id);
            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            _context.Rules.Remove(rule);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}