using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/adjudication")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class AdjudicationController : BaseController
    {
        private readonly IAdjudicationRepository _adjRepo;

        public AdjudicationController(IAdjudicationRepository adjRepo)
        {
            _adjRepo = adjRepo;
        }
        
        [HttpPost("auto/{claimId}")]
        public async Task<IActionResult> AutoAdjudicate(int claimId) 
        {
            var result = await _adjRepo.AutoAdjudicateAsync(claimId);

            // STEP 2 — Null means claim doesn't exist
            if (result == null)
                return NotFound($"Claim with ID {claimId} was not found.");

            // STEP 3 — Check if claim was already processed
            if (result.Decision == "AlreadyProcessed")
                return BadRequest(result.Notes);

            // STEP 4 — Return result based on decision
            // PendingReview = routed to manual queue — tell staff what happened
            if (result.Decision == "PendingReview")
                return Ok(new
                {
                    message = $"Claim {claimId} has been routed for manual review " +
                              $"because it exceeds the auto-adjudication threshold. " +
                              $"It has been assigned to the InsuranceStaff queue.",
                    adjudication = result
                });

            // STEP 5 — Decision made (Paid or Denied) → return full result
            return Ok(result);
        }

        [HttpPost("manual")]
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
                                  "Paid, Denied, or Partial.");

            if (string.IsNullOrWhiteSpace(dto.Notes))
                return BadRequest("Notes are required for manual adjudication. " +
                                  "Please document your reason for this decision.");

            var result = await _adjRepo.ManualAdjudicateAsync(dto, userId.Value);

            if (result == null)
                return NotFound($"Claim with ID {dto.ClaimID} was not found.");

            return Ok(result);
        }

        [HttpGet("{claimId}")]
        public async Task<IActionResult> GetAdjudication(int claimId) 
        {
            var record = await _adjRepo.GetAdjudicationAsync(claimId);
            

            if (record == null)
                return NotFound($"No adjudication record found for Claim {claimId}. " +
                                $"The claim may not have been adjudicated yet.");

            return Ok(record);
        }

        [HttpGet("{claimId}/trace")]
        public async Task<IActionResult> GetRuleTrace(int claimId) 
        {
            var trace = await _adjRepo.GetRuleTraceAsync(claimId);

            if (trace == null)
                return NotFound($"No adjudication record found for Claim {claimId}. " +
                                $"The claim may not have been adjudicated yet.");

            return Ok(trace);
        }
    }
}
