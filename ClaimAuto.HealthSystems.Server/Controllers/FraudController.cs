using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff handle fraud
    public class FraudController : ControllerBase
    {
        private readonly IFraudService _service;

        public FraudController(IFraudService service)
        {
            _service = service;
        }

        // GET: api/fraud/scores
        [HttpGet("scores")]
        public async Task<ActionResult<IEnumerable<FraudScore>>> GetAllScores()
        {
            var scores = await _service.GetAllScoresAsync();
            return Ok(scores);
        }

        // GET: api/fraud/cases
        [HttpGet("cases")]
        public async Task<ActionResult<IEnumerable<FraudCase>>> GetAllCases()
        {
            var cases = await _service.GetOpenCasesAsync();
            return Ok(cases);
        }

        // POST: api/fraud/score/5
        [HttpPost("score/{claimId}")]
        public async Task<ActionResult<FraudScore>> ScoreClaim(int claimId)
        {
            var result = await _service.ScoreClaimAsync(claimId);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Score);
        }

        // PUT: api/fraud/cases/5/resolve
        [HttpPut("cases/{caseId}/resolve")]
        public async Task<IActionResult> ResolveCase(int caseId, [FromBody] FraudCase update)
        {
            var result = await _service.ResolveCaseAsync(caseId, update);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}