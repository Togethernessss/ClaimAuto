using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]  // ← Any authenticated user (Policyholder/Hospital can file appeals)
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
            // ACID: Transaction ensures Appeal + Task + AuditLog are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
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
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return CreatedAtAction(nameof(GetAppeal), new { id = appeal.AppealID }, appeal);
        }

        // PUT: api/appeals/5/decide
        // Insurance Staff makes a decision on an appeal
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] Appeal update)
        {
            var appeal = await _context.Appeals.FindAsync(id);
            if (appeal == null)
                return NotFound();

            // ACID: Transaction ensures Appeal update + AuditLog are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
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
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

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