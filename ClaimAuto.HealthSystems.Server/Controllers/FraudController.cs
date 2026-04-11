using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/fraud")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class FraudController : BaseController
    {
        // GET /api/fraud/scores/{claimId}
        // Returns the fraud score for a specific claim.
        [HttpGet("scores/{claimId}")]
        public async Task<IActionResult> GetFraudScore(int claimId) 
        {
            throw new NotImplementedException();
        }

        // POST /api/fraud/scores/{claimId}
        // Runs the fraud scoring engine on a claim.
        // If score >= 70: auto-creates FraudCase + Notification
        //                 in one ACID transaction.
        [HttpPost("scores/{claimId}")]
        public async Task<IActionResult> ScoreClaim(int claimId) 
        {
            throw new NotImplementedException();
        }

        // GET /api/fraud/cases
        // Returns all fraud cases. Filter by Status, Priority.
        [HttpGet("cases")]
        public async Task<IActionResult> GetAllFraudCases(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            throw new NotImplementedException(); 
        }

        // GET /api/fraud/cases/{id}
        // Returns single fraud case with full details.
        [HttpGet("cases/{id}")]
        public async Task<IActionResult> GetFraudCaseById(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/fraud/cases
        // Manually opens a fraud case. OpenedBy from JWT token.
        [HttpPost("cases")]
        public async Task<IActionResult> CreateFraudCase(
            [FromBody] CreateFraudCaseDto dto)
        {
            throw new NotImplementedException(); 
        }

        // PUT /api/fraud/cases/{id}/resolve
        // Vikram resolves a fraud case.
        // Sets Status to Resolved, stamps ResolvedAt.
        [HttpPut("cases/{id}/resolve")]
        public async Task<IActionResult> ResolveFraudCase(int id,
            [FromBody] ResolveFraudCaseDto dto)
        {
            throw new NotImplementedException();
        }
    }
}
