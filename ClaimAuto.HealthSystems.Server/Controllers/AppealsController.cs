using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/appeals")]
    [Authorize]   // Any authenticated user can file — role filtering inside
    public class AppealsController : BaseController
    {
        // GET /api/appeals
        // Policyholder sees only their own appeals.
        // Hospital sees only their own appeals.
        // Staff and Admin see all.
        [HttpGet]
        public async Task<IActionResult> GetAllAppeals() 
        { 
            throw new NotImplementedException();
        }

        // GET /api/appeals/{id}
        // Returns single appeal.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAppealById(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/appeals
        // Policyholder or Hospital files an appeal.
        // FiledBy from JWT token.
        // Auto-creates a Task for InsuranceStaff with 7-day SLA.
        [HttpPost]
        public async Task<IActionResult> FileAppeal(
            [FromBody] CreateAppealDto dto)
        {
            throw new NotImplementedException();
        }

        // PUT /api/appeals/{id}/decide
        // Sneha decides on an appeal.
        // DecisionBy from JWT token. DecisionAt stamped by server.
        // Only one field in the request body — Outcome.
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> DecideAppeal(int id,
            [FromBody] DecideAppealDto dto)
        {
            throw new NotImplementedException();
        }

        // PUT /api/appeals/{id}/withdraw
        // Policyholder or Hospital withdraws their own appeal.
        [HttpPut("{id}/withdraw")]
        public async Task<IActionResult> WithdrawAppeal(int id) 
        {
            throw new NotImplementedException();
        }

        // ── Subrogation sub-routes ────────────────────────────────

        // POST /api/appeals/subrogation
        // Creates a subrogation record for third-party recovery.
        [HttpPost("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> CreateSubrogation(
            [FromBody] CreateSubrogationDto dto)
        {
            throw new NotImplementedException();
        }

        // GET /api/appeals/subrogation
        // Returns all subrogation records.
        [HttpGet("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> GetSubrogations() 
        {
            throw new NotImplementedException();
        }
    }
}
