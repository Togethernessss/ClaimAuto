<<<<<<< HEAD
﻿using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Data;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppealsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AppealsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/appeals
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Appeal>>> GetAllAppeals()
        {
            var appeals = await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .ToListAsync();

            return Ok(appeals);
        }

        // GET: api/appeals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Appeal>> GetAppeal(int id)
        {
            var appeal = await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .Include(a => a.DecisionBy)
                .FirstOrDefaultAsync(a => a.AppealID == id);

            if (appeal == null)
                return NotFound();

            return Ok(appeal);
        }

        // POST: api/appeals
        // Policyholder or Hospital files an appeal
        [HttpPost]
        public async Task<ActionResult<Appeal>> FileAppeal(Appeal appeal)
        {
            appeal.FiledAt = DateTime.UtcNow;
            appeal.Status = AppealStatus.Filed;

            _context.Appeals.Add(appeal);
            await _context.SaveChangesAsync();

            // Create a task for Insurance Staff to review
            _context.Tasks.Add(new Tasks
            {
                AssignedTo = 1, // Replace with actual staff assignment logic
                ClaimID = appeal.ClaimID,
                Description = $"Review appeal #{appeal.AppealID} for Claim #{appeal.ClaimID}. Reason: {appeal.Reason}",
                DueDate = DateTime.UtcNow.AddDays(7), // 7-day SLA
                Priority = TaskPriority.High,
                CreatedAt = DateTime.UtcNow,
                Status = Model.TaskStatus.Pending
            });

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = appeal.FiledBy,
                Action = "FileAppeal",
                ResourceType = "Appeal",
                ResourceID = appeal.AppealID.ToString(),
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAppeal), new { id = appeal.AppealID }, appeal);
        }

        // PUT: api/appeals/5/decide
        // Insurance Staff makes a decision on an appeal
        [HttpPut("{id}/decide")]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] Appeal update)
        {
            var appeal = await _context.Appeals.FindAsync(id);
            if (appeal == null)
                return NotFound();

            appeal.Status = AppealStatus.Decided;
            appeal.Outcome = update.Outcome;
            appeal.DecisionAt = DateTime.UtcNow;
            appeal.DecisionByID = update.DecisionByID;

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = update.DecisionByID ?? 0,
                Action = "DecideAppeal",
                ResourceType = "Appeal",
                ResourceID = id.ToString(),
                DetailsJSON = $"{{\"Outcome\":\"{update.Outcome}\"}}",
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET: api/appeals/subrogations
        [HttpGet("subrogations")]
        public async Task<ActionResult<IEnumerable<Subrogation>>> GetSubrogations()
        {
            var subs = await _context.Subrogations
                .Include(s => s.Claim)
                .ToListAsync();
            return Ok(subs);
        }

        // POST: api/appeals/subrogations
        [HttpPost("subrogations")]
        public async Task<ActionResult<Subrogation>> CreateSubrogation(Subrogation sub)
        {
            sub.InitiatedAt = DateTime.UtcNow;
            sub.Status = SubrogationStatus.Initiated;
            _context.Subrogations.Add(sub);
            await _context.SaveChangesAsync();
            return Ok(sub);
        }
    }
}
=======
﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/appeals")]
    [Authorize]   // Any authenticated user can file — role filtering inside
    public class AppealsController : ControllerBase
    {
        // GET /api/appeals
        // Policyholder sees only their own appeals.
        // Hospital sees only their own appeals.
        // Staff and Admin see all.
        [HttpGet]
        public async Task<IActionResult> GetAllAppeals() { }

        // GET /api/appeals/{id}
        // Returns single appeal.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAppealById(int id) { }

        // POST /api/appeals
        // Policyholder or Hospital files an appeal.
        // FiledBy from JWT token.
        // Auto-creates a Task for InsuranceStaff with 7-day SLA.
        [HttpPost]
        public async Task<IActionResult> FileAppeal(
            [FromBody] CreateAppealDto dto)
        { }

        // PUT /api/appeals/{id}/decide
        // Sneha decides on an appeal.
        // DecisionBy from JWT token. DecisionAt stamped by server.
        // Only one field in the request body — Outcome.
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> DecideAppeal(int id,
            [FromBody] DecideAppealDto dto)
        { }

        // PUT /api/appeals/{id}/withdraw
        // Policyholder or Hospital withdraws their own appeal.
        [HttpPut("{id}/withdraw")]
        public async Task<IActionResult> WithdrawAppeal(int id) { }

        // ── Subrogation sub-routes ────────────────────────────────

        // POST /api/appeals/subrogation
        // Creates a subrogation record for third-party recovery.
        [HttpPost("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> CreateSubrogation(
            [FromBody] CreateSubrogationDto dto)
        { }

        // GET /api/appeals/subrogation
        // Returns all subrogation records.
        [HttpGet("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> GetSubrogations() { }
    }
}
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
