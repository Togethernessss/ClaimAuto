using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages adjudication rules (Draft → Active → Inactive). Admin only.</summary>
    [ApiController]
    [Route("api/rules")]
    [Authorize(Roles = "Admin")]
    [Produces("application/json")]
    public class RulesController : BaseController
    {
        private readonly IRuleRepository _ruleRepo;

        public RulesController(IRuleRepository ruleRepo)
        {
            _ruleRepo = ruleRepo;
        }

        /// <summary>Returns all adjudication rules for the organisation. Optionally filter by status or rule type.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllRules(
            [FromQuery] string? status,
            [FromQuery] string? ruleType)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var rules = await _ruleRepo.GetAllRulesAsync(status, ruleType, userOrgId);
            return Ok(rules);
        }

        /// <summary>Returns a single adjudication rule by ID.</summary>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRuleById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var rule = await _ruleRepo.GetRuleByIdAsync(id, userOrgId);

            if (rule == null)
                return NotFound($"Rule with ID {id} was not found.");

            return Ok(rule);
        }

        /// <summary>Creates a new Draft rule. RuleType must match a registered template key from RuleTemplate.All.</summary>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateRule([FromBody] CreateRuleDto dto)
        {
            var userId = GetLoggedInUserId();
            var userOrgId = GetLoggedInUserOrgId();

            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // RuleType is now a template-key string. Validate against the registered
            // list of templates so admins can't create rules the engine can't execute.
            if (string.IsNullOrWhiteSpace(dto.RuleType) ||
                !RuleTemplate.All.Any(t => string.Equals(t, dto.RuleType, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest($"Invalid RuleType '{dto.RuleType}'. " +
                                  $"Must be one of: {string.Join(", ", RuleTemplate.All)}.");
            }

            var created = await _ruleRepo.CreateRuleAsync(dto, userId.Value, userOrgId);

            return CreatedAtAction(nameof(GetRuleById),
                new { id = created.RuleID }, created);
        }

        /// <summary>Updates a rule's name, description, or parameters.</summary>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRule(int id, [FromBody] UpdateRuleDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify rule belongs to this org before updating ──               // ← SaaS FIX
            var existing = await _ruleRepo.GetRuleByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (existing == null)                                                  // ← SaaS FIX
                return NotFound($"Rule with ID {id} was not found.");             // ← SaaS FIX

            var updated = await _ruleRepo.UpdateRuleAsync(id, dto, userId.Value);

            if (updated == null)
                return NotFound($"Rule with ID {id} was not found.");

            return Ok(updated);
        }

        /// <summary>Transitions a rule from Draft to Active so the adjudication engine evaluates it on new claims.</summary>
        [HttpPut("{id}/activate")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActivateRule(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify rule belongs to this org before activating ──             // ← SaaS FIX
            var existing = await _ruleRepo.GetRuleByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (existing == null)                                                  // ← SaaS FIX
                return NotFound($"Rule with ID {id} was not found.");             // ← SaaS FIX

            var result = await _ruleRepo.ActivateRuleAsync(id, userId.Value);

            return result switch
            {
                "ok" => Ok($"Rule {id} has been activated. " +
                           $"The adjudication engine will now use this rule."),
                "notfound" => NotFound($"Rule with ID {id} was not found."),
                "alreadyactive" => BadRequest($"Rule {id} is already Active."),
                _ => StatusCode(500, "Unexpected error during activation.")
            };
        }

        /// <summary>Transitions a rule from Active to Inactive, removing it from future adjudication runs.</summary>
        [HttpPut("{id}/deactivate")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeactivateRule(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify rule belongs to this org before deactivating ──           // ← SaaS FIX
            var existing = await _ruleRepo.GetRuleByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (existing == null)                                                  // ← SaaS FIX
                return NotFound($"Rule with ID {id} was not found.");             // ← SaaS FIX

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

        /// <summary>Permanently deletes a rule. Only Draft rules can be deleted; use /deactivate for Active rules.</summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify rule belongs to this org before deleting ──               // ← SaaS FIX
            var existing = await _ruleRepo.GetRuleByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (existing == null)                                                  // ← SaaS FIX
                return NotFound($"Rule with ID {id} was not found.");             // ← SaaS FIX

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