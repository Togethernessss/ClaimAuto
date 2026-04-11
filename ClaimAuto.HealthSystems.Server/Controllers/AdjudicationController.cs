using ClaimAuto.HealthSystems.Server.DTOs;
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
        // POST /api/adjudication/auto/{claimId}
        // Runs the rule engine on the claim automatically.
        // Checks: Policy active, Hospital in-network, Amount threshold,
        //         Duplicate detection, Deductible calculation.
        // Writes immutable AdjudicationRecord.
        // Updates Claim.Status to Adjudicated.
        // Uses ACID transaction — both saved together or neither.
        [HttpPost("auto/{claimId}")]
        public async Task<IActionResult> AutoAdjudicate(int claimId) 
        {
            throw new NotImplementedException();
        }

        // POST /api/adjudication/manual
        // Sneha manually overrides or adjudicates a claim.
        // PerformedBy set from JWT token — not from body.
        // Uses ACID transaction.
        [HttpPost("manual")]
        public async Task<IActionResult> ManualAdjudicate(
            [FromBody] ManualAdjudicateDto dto)
        {
            throw new NotImplementedException();
        }

        // GET /api/adjudication/{claimId}
        // Returns the adjudication record for a claim.
        // Returns: AdjudicationResponseDto
        [HttpGet("{claimId}")]
        public async Task<IActionResult> GetAdjudication(int claimId) 
        {
            throw new NotImplementedException();
        }

        // GET /api/adjudication/{claimId}/trace
        // Returns the rule trace — which rules fired and why.
        // Returns: List<RuleTraceDto>
        [HttpGet("{claimId}/trace")]
        public async Task<IActionResult> GetRuleTrace(int claimId) 
        {
            throw new NotImplementedException();
        }
    }
}
