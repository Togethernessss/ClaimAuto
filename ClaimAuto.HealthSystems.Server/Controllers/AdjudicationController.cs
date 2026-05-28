using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages claim adjudication — auto and manual decisioning. Admin and InsuranceStaff only.</summary>
    [ApiController]
    [Route("api/adjudication")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [Produces("application/json")]
    public class AdjudicationController : BaseController
    {
        private readonly IAdjudicationRepository _adjRepo;

        public AdjudicationController(IAdjudicationRepository adjRepo)
        {
            _adjRepo = adjRepo;
        }


        /// <summary>Runs the automated adjudication engine on a claim. Claims above the threshold are routed for manual review.</summary>
        /// <param name="claimId">The claim ID to adjudicate.</param>
        /// <response code="200">Adjudication complete — returns decision or routes to manual review.</response>
        /// <response code="400">Claim has already been processed.</response>
        /// <response code="404">Claim not found.</response>
        [HttpPost("auto/{claimId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AutoAdjudicate(int claimId)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var result = await _adjRepo.AutoAdjudicateAsync(claimId, userOrgId);

            if (result == null)
                return NotFound($"Claim with ID {claimId} was not found.");

            if (result.Decision == "AlreadyProcessed")
                return BadRequest(result.Notes);

            if (result.Decision == "PendingReview")
                return Ok(new
                {
                    message = $"Claim {claimId} has been routed for manual review " +
                              $"because it exceeds the auto-adjudication threshold. " +
                              $"It has been assigned to the InsuranceStaff queue.",
                    adjudication = result
                });

            return Ok(result);
        }

        /// <summary>Records a manual adjudication decision (Paid, Denied, or Partial) with required notes.</summary>
        /// <param name="dto">Adjudication details including ClaimID, Decision, and Notes.</param>
        /// <response code="200">Manual adjudication recorded successfully.</response>
        /// <response code="400">Invalid decision or missing notes.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Claim not found.</response>
        [HttpPost("manual")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ManualAdjudicate(
            [FromBody] ManualAdjudicateDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (!Enum.TryParse<AdjDecision>(dto.Decision, true, out var parsedDecision))
                return BadRequest($"Invalid Decision '{dto.Decision}'. " +
                                  $"Must be: Paid, Denied, or Partial.");

            if (parsedDecision == AdjDecision.PendingReview)
                return BadRequest("Decision cannot be 'PendingReview'. " +
                                  "Manual adjudication requires a final decision: " +
                                  "Approved, Denied, or Partial.");

            if (string.IsNullOrWhiteSpace(dto.Notes))
                return BadRequest("Notes are required for manual adjudication. " +
                                  "Please document your reason for this decision.");

            if ((parsedDecision == AdjDecision.Approved || parsedDecision == AdjDecision.Partial)
                && dto.PayableAmount.HasValue && dto.PayableAmount.Value <= 0)
                return BadRequest("PayableAmount must be greater than zero for Approved or Partial decisions.");

            var userOrgId = GetLoggedInUserOrgId();
            var result = await _adjRepo.ManualAdjudicateAsync(dto, userId.Value, userOrgId);

            if (result == null)
                return NotFound($"Claim with ID {dto.ClaimID} was not found.");

            return Ok(result);
        }

        /// <summary>Returns the rule trace showing which adjudication rules fired on a claim.</summary>
        /// <param name="claimId">The claim ID to get the rule trace for.</param>
        /// <response code="200">Returns the rule trace.</response>
        /// <response code="404">No adjudication record found for this claim.</response>
        [HttpGet("{claimId}/trace")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRuleTrace(int claimId)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var trace = await _adjRepo.GetRuleTraceAsync(claimId, userOrgId);

            if (trace == null)
                return NotFound($"No adjudication record found for Claim {claimId}. " +
                                $"The claim may not have been adjudicated yet.");

            return Ok(trace);
        }


        /// <summary>Returns the full adjudication record for a claim.</summary>
        /// <param name="claimId">The claim ID to retrieve adjudication for.</param>
        /// <response code="200">Returns the adjudication record.</response>
        /// <response code="404">No adjudication record found for this claim.</response>
        [HttpGet("{claimId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAdjudication(int claimId)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var record = await _adjRepo.GetAdjudicationAsync(claimId, userOrgId);


            if (record == null)
                return NotFound($"No adjudication record found for Claim {claimId}. " +
                                $"The claim may not have been adjudicated yet.");

            return Ok(record);
        }
    }
}