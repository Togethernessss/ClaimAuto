using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
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
        public async Task<ActionResult<IEnumerable<AppealResponseDto>>> GetAllAppeals()
        {
            var appeals = await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .Include(a => a.DecisionBy)
                .ToListAsync();

            var response = appeals.Select(a => new AppealResponseDto
            {
                AppealID = a.AppealID,
                ClaimID = a.ClaimID,
                FiledBy = a.FiledBy,
                FiledByName = a.FiledByUser?.Name ?? "",
                FiledAt = a.FiledAt,
                Reason = a.Reason,
                Status = a.Status.ToString(),
                Outcome = a.Outcome?.ToString(),
                DecisionAt = a.DecisionAt,
                DecisionByID = a.DecisionByID,
                DecisionByName = a.DecisionBy?.Name
            });

            return Ok(response);
        }

        // GET: api/appeals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AppealResponseDto>> GetAppeal(int id)
        {
            var appeal = await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .Include(a => a.DecisionBy)
                .FirstOrDefaultAsync(a => a.AppealID == id);

            if (appeal == null)
                return NotFound();

            var response = new AppealResponseDto
            {
                AppealID = appeal.AppealID,
                ClaimID = appeal.ClaimID,
                FiledBy = appeal.FiledBy,
                FiledByName = appeal.FiledByUser?.Name ?? "",
                FiledAt = appeal.FiledAt,
                Reason = appeal.Reason,
                Status = appeal.Status.ToString(),
                Outcome = appeal.Outcome?.ToString(),
                DecisionAt = appeal.DecisionAt,
                DecisionByID = appeal.DecisionByID,
                DecisionByName = appeal.DecisionBy?.Name
            };

            return Ok(response);
        }

        // POST: api/appeals
        [HttpPost]
        public async Task<ActionResult<AppealResponseDto>> FileAppeal(CreateAppealDto dto)
        {
            // Get the logged-in user's ID from JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int filedByUserId = int.Parse(userIdClaim!.Value);

            var appeal = new Appeal
            {
                ClaimID = dto.ClaimID,
                FiledBy = filedByUserId,
                Reason = dto.Reason,
                DocumentsJSON = dto.DocumentsJSON,
                FiledAt = DateTime.UtcNow,
                Status = AppealStatus.Filed
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Appeals.Add(appeal);
                await _context.SaveChangesAsync();

                _context.Tasks.Add(new Tasks
                {
                    AssignedTo = 1,
                    ClaimID = appeal.ClaimID,
                    Description = $"Review appeal #{appeal.AppealID} for Claim #{appeal.ClaimID}. Reason: {appeal.Reason}",
                    DueDate = DateTime.UtcNow.AddDays(7),
                    Priority = TaskPriority.High,
                    CreatedAt = DateTime.UtcNow,
                    Status = Model.TaskStatus.Pending
                });

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = filedByUserId,
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

            await _context.Entry(appeal).Reference(a => a.FiledByUser).LoadAsync();

            var response = new AppealResponseDto
            {
                AppealID = appeal.AppealID,
                ClaimID = appeal.ClaimID,
                FiledBy = appeal.FiledBy,
                FiledByName = appeal.FiledByUser?.Name ?? "",
                FiledAt = appeal.FiledAt,
                Reason = appeal.Reason,
                Status = appeal.Status.ToString(),
                Outcome = appeal.Outcome?.ToString(),
                DecisionAt = appeal.DecisionAt,
                DecisionByID = appeal.DecisionByID
            };

            return CreatedAtAction(nameof(GetAppeal), new { id = appeal.AppealID }, response);
        }

        // PUT: api/appeals/5/decide
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] DecideAppealDto dto)
        {
            var appeal = await _context.Appeals.FindAsync(id);
            if (appeal == null)
                return NotFound();

            // Get the logged-in user's ID from JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int decisionByUserId = int.Parse(userIdClaim!.Value);

            if (!Enum.TryParse<AppealOutcome>(dto.Outcome, true, out var outcome))
                return BadRequest($"Invalid Outcome: {dto.Outcome}. Valid: Upheld, Overturned, PartiallyUpheld");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                appeal.Status = AppealStatus.Decided;
                appeal.Outcome = outcome;
                appeal.DecisionAt = DateTime.UtcNow;
                appeal.DecisionByID = decisionByUserId;

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = decisionByUserId,
                    Action = "DecideAppeal",
                    ResourceType = "Appeal",
                    ResourceID = id.ToString(),
                    DetailsJSON = $"{{\"Outcome\":\"{dto.Outcome}\"}}",
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

