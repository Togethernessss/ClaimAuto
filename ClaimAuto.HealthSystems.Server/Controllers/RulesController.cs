<<<<<<< HEAD
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RulesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RulesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/rules
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Rule>>> GetAllRules()
        {
            var rules = await _context.Rules
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            return Ok(rules);
        }

        // GET: api/rules/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Rule>> GetRule(int id)
        {
            var rule = await _context.Rules
                .Include(r => r.CreatedByUser)
                .FirstOrDefaultAsync(r => r.RuleID == id);

            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            return Ok(rule);
        }

        // GET: api/rules/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Rule>>> GetActiveRules()
        {
            var rules = await _context.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            return Ok(rules);
        }

        // GET: api/rules/type/Coverage
        [HttpGet("type/{ruleType}")]
        public async Task<ActionResult<IEnumerable<Rule>>> GetRulesByType(RuleType ruleType)
        {
            var rules = await _context.Rules
                .Where(r => r.RuleType == ruleType)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            return Ok(rules);
        }

        // POST: api/rules
        [HttpPost]
        public async Task<ActionResult<Rule>> CreateRule(Rule rule)
        {
            rule.CreatedAt = DateTime.UtcNow;
            rule.Status = RuleStatus.Draft;

            _context.Rules.Add(rule);
            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = rule.CreatedBy,
                Action = "CreateRule",
                ResourceType = "Rule",
                ResourceID = rule.RuleID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRule), new { id = rule.RuleID }, rule);
        }

        // PUT: api/rules/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id, Rule updatedRule)
        {
            var rule = await _context.Rules.FindAsync(id);
            if (rule == null)
                return NotFound($"Rule with ID {id} not found.");

            rule.Name = updatedRule.Name;
            rule.Description = updatedRule.Description;
            rule.RuleType = updatedRule.RuleType;
            rule.ConditionExpressionJSON = updatedRule.ConditionExpressionJSON;
            rule.ActionExpressionJSON = updatedRule.ActionExpressionJSON;
            rule.Priority = updatedRule.Priority;
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
=======
﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/rules")]
    [Authorize(Roles = "Admin")]   // Admin only — manages business rules
    public class RulesController : ControllerBase
    {
        // GET /api/rules
        // Returns all rules. Filter by Status, RuleType.
        [HttpGet]
        public async Task<IActionResult> GetAllRules(
            [FromQuery] string? status,
            [FromQuery] string? ruleType)
        { }

        // GET /api/rules/{id}
        // Returns single rule with full details.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRuleById(int id) { }

        // POST /api/rules
        // Creates a new rule. Starts as Draft.
        // Version = 1. CreatedBy from JWT token.
        // Uses ACID transaction.
        [HttpPost]
        public async Task<IActionResult> CreateRule(
            [FromBody] CreateRuleDto dto)
        { }

        // PUT /api/rules/{id}
        // Updates a rule. Auto-increments Version.
        // Old version preserved in database for audit.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id,
            [FromBody] UpdateRuleDto dto)
        { }

        // PUT /api/rules/{id}/activate
        // Changes Status from Draft/Inactive to Active.
        // Rule starts being used in adjudication immediately.
        [HttpPut("{id}/activate")]
        public async Task<IActionResult> ActivateRule(int id) { }

        // PUT /api/rules/{id}/deactivate
        // Changes Status to Inactive.
        // Rule stops being used in adjudication immediately.
        [HttpPut("{id}/deactivate")]
        public async Task<IActionResult> DeactivateRule(int id) { }

        // DELETE /api/rules/{id}
        // Only allowed for Draft rules that have never been activated.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id) { }
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
    }
}
