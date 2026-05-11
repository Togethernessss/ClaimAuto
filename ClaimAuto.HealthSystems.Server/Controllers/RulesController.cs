using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages adjudication rules (Draft → Active → Inactive state machine). Admin only.</summary>
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

        /// <summary>Returns all adjudication rules with optional filters.</summary>
        /// <param name="status">Filter by status (Draft, Active, Inactive).</param>
        /// <param name="ruleType">Filter by type (Coverage, Payment, Validation).</param>
        /// <response code="200">Returns list of rules.</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllRules(
            [FromQuery] string? status,
            [FromQuery] string? ruleType)
        {
            var rules = await _ruleRepo.GetAllRulesAsync(status, ruleType);
            return Ok(rules);
        }


        /// <summary>Returns a single rule by ID.</summary>
        /// <param name="id">The rule ID.</param>
        /// <response code="200">Returns the rule.</response>
        /// <response code="404">Rule not found.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRuleById(int id) 
        {
            var rule = await _ruleRepo.GetRuleByIdAsync(id);

            if (rule == null)
                return NotFound($"Rule with ID {id} was not found.");

            return Ok(rule);
        }

        /// <summary>Creates a new adjudication rule in Draft status.</summary>
        /// <param name="dto">Rule details including name, type (Coverage/Payment/Validation), and logic.</param>
        /// <response code="201">Rule created successfully in Draft status.</response>
        /// <response code="400">Invalid RuleType.</response>
        /// <response code="401">Unauthorized.</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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


        /// <summary>Updates a rule's details.</summary>
        /// <param name="id">The rule ID to update.</param>
        /// <param name="dto">Fields to update.</param>
        /// <response code="200">Rule updated successfully.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Rule not found.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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


        /// <summary>Activates a Draft rule so the adjudication engine will use it.</summary>
        /// <param name="id">The rule ID to activate.</param>
        /// <response code="200">Rule activated successfully.</response>
        /// <response code="400">Rule is already Active.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Rule not found.</response>
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

        /// <summary>Deactivates an Active rule so the adjudication engine stops using it.</summary>
        /// <param name="id">The rule ID to deactivate.</param>
        /// <response code="200">Rule deactivated successfully.</response>
        /// <response code="400">Rule is a Draft (never activated) or already Inactive.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Rule not found.</response>
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


        /// <summary>Permanently deletes a rule. Only Draft rules (never activated) can be deleted.</summary>
        /// <param name="id">The rule ID to delete.</param>
        /// <response code="200">Rule deleted successfully.</response>
        /// <response code="400">Rule has been activated and cannot be deleted — use deactivate instead.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Rule not found.</response>
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
