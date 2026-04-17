using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/rules")]
    [Authorize(Roles = "Admin")]   // Admin only — manages business rules
    public class RulesController : BaseController
    {
        private readonly IRuleRepository _ruleRepo;

        public RulesController(IRuleRepository ruleRepo)
        {
            _ruleRepo = ruleRepo;
        }

        // GET /api/rules
        // Returns all rules. Filter by Status, RuleType.
        [HttpGet]
        public async Task<IActionResult> GetAllRules(
            [FromQuery] string? status,
            [FromQuery] string? ruleType)
        {
            var rules = await _ruleRepo.GetAllRulesAsync(status, ruleType);
            return Ok(rules);
        }

        // GET /api/rules/{id}
        // Returns single rule with full details.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRuleById(int id) 
        {
            var rule = await _ruleRepo.GetRuleByIdAsync(id);

            if (rule == null)
                return NotFound($"Rule with ID {id} was not found.");

            return Ok(rule);
        }

        // POST /api/rules
        // Creates a new rule. Starts as Draft.
        // Version = 1. CreatedBy from JWT token.
        // Uses ACID transaction.
        [HttpPost]
        public async Task<IActionResult> CreateRule(
            [FromBody] CreateRuleDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (!Enum.TryParse<RuleType>(dto.RuleType, true, out _))
                return BadRequest($"Invalid RuleType '{dto.RuleType}'. " +
                                  $"Must be: Coverage, Payment, or Validation.");

            var created = await _ruleRepo.CreateRuleAsync(dto, userId.Value);

            return CreatedAtAction(
                nameof(GetRuleById),
                new { id = created.RuleID },
                created);
        }

        // PUT /api/rules/{id}
        // Updates a rule. Auto-increments Version.
        // Old version preserved in database for audit.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id,
            [FromBody] UpdateRuleDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var updated = await _ruleRepo.UpdateRuleAsync(id, dto, userId.Value);

            if (updated == null)
                return NotFound($"Rule with ID {id} was not found.");

            return Ok(updated);
        }

        // PUT /api/rules/{id}/activate
        // Changes Status from Draft/Inactive to Active.
        // Rule starts being used in adjudication immediately.
        [HttpPut("{id}/deactivate")]
        public async Task<IActionResult> DeactivateRule(int id) 
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var result = await _ruleRepo.DeactivateRuleAsync(id, userId.Value);

            return result switch
            {
                "ok" => Ok($"Rule {id} has been deactivated. " +
                                 $"The adjudication engine will no longer use this rule."),
                "notfound" => NotFound($"Rule with ID {id} was not found."),
                "isdraft" => BadRequest($"Rule {id} is a Draft and has never been activated. " +
                                         $"Use DELETE to remove it instead."),
                "notactive" => BadRequest($"Rule {id} is already Inactive."),
                _ => StatusCode(500, "Unexpected error during deactivation.")
            };
        }

        // PUT /api/rules/{id}/deactivate
        // Changes Status to Inactive.
        // Rule stops being used in adjudication immediately.
        [HttpPut("{id}/activate")]
        public async Task<IActionResult> ActivateRule(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var result = await _ruleRepo.ActivateRuleAsync(id, userId.Value);

            // Map result string → correct HTTP response
            return result switch
            {
                "ok" => Ok($"Rule {id} has been activated. " +
                                      $"The adjudication engine will now use this rule."),
                "notfound" => NotFound($"Rule with ID {id} was not found."),
                "alreadyactive" => BadRequest($"Rule {id} is already Active."),
                _ => StatusCode(500, "Unexpected error during activation.")
            };

            // HTTP 200 OK → "Rule 6 has been activated. The adjudication engine will now use this rule."
            // HTTP 404     → "Rule with ID 99 was not found."
            // HTTP 400     → "Rule 6 is already Active."
        }

        // DELETE /api/rules/{id}
        // Only allowed for Draft rules that have never been activated.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id) 
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var result = await _ruleRepo.DeleteRuleAsync(id, userId.Value);

            return result switch
            {
                "ok" => Ok($"Rule {id} has been permanently deleted."),
                "notfound" => NotFound($"Rule with ID {id} was not found."),
                "notdraft" => BadRequest(
                                $"Rule {id} cannot be deleted because it has been activated " +
                                $"and may be referenced by adjudication records. " +
                                $"Use /deactivate to stop using this rule instead."),
                _ => StatusCode(500, "Unexpected error during deletion.")
            };
        }
    }
}
