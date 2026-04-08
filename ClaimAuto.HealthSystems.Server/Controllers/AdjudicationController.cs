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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff can adjudicate
    public class AdjudicationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdjudicationController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/adjudication
        // Returns all adjudication records
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AdjudicationRecord>>> GetAllRecords()
        {
            var records = await _context.AdjudicationRecords
                .Include(a => a.Claim)
                .Include(a => a.PerformedBy)
                .ToListAsync();

            return Ok(records);
        }

        // GET: api/adjudication/claim/5
        // Returns all adjudication records for a specific claim
        [HttpGet("claim/{claimId}")]
        public async Task<ActionResult<IEnumerable<AdjudicationRecord>>> GetByClaimId(int claimId)
        {
            var records = await _context.AdjudicationRecords
                .Where(a => a.ClaimID == claimId)
                .OrderByDescending(a => a.ExecutedAt)
                .ToListAsync();

            return Ok(records);
        }

        // POST: api/adjudication/auto/5
        // Runs auto-adjudication on a claim
        [HttpPost("auto/{claimId}")]
        public async Task<ActionResult<AdjudicationRecord>> AutoAdjudicate(int claimId)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.Member)
                    .ThenInclude(m => m.Policy)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null)
                return NotFound($"Claim {claimId} not found.");

            // Load active rules sorted by priority
            var rules = await _context.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            // ── Basic rule engine logic ───────────────────
            var firedRules = new List<string>();
            var decision = AdjDecision.Paid;
            string notes = "";

            // Rule 1: Member must be active
            if (claim.Member.Status != MemberStatus.Active)
            {
                decision = AdjDecision.Denied;
                notes = "Member is not active.";
                firedRules.Add("MemberActiveCheck: FAILED");
            }
            else firedRules.Add("MemberActiveCheck: PASSED");

            // Rule 2: Policy must be active
            if (claim.Member.Policy.Status != PolicyStatus.Active)
            {
                decision = AdjDecision.Denied;
                notes = "Policy is not active.";
                firedRules.Add("PolicyActiveCheck: FAILED");
            }
            else firedRules.Add("PolicyActiveCheck: PASSED");

            // Rule 3: Amount within policy limit (OutOfPocketMax)
            if (claim.Member.Policy.OutOfPocketMax.HasValue
                && claim.TotalBilledAmount > claim.Member.Policy.OutOfPocketMax)
            {
                decision = AdjDecision.PendingReview;
                notes = "Amount exceeds policy limit. Routed for manual review.";
                firedRules.Add("AmountLimitCheck: EXCEEDED — Pending Review");
            }
            else firedRules.Add("AmountLimitCheck: PASSED");

            // Rule 4: Duplicate claim detection
            bool isDuplicate = await _context.Claims
                .AnyAsync(c => c.MemberID == claim.MemberID
                            && c.TotalBilledAmount == claim.TotalBilledAmount
                            && c.ClaimID != claim.ClaimID
                            && c.SubmittedAt >= DateTime.UtcNow.AddDays(-30));

            if (isDuplicate)
            {
                decision = AdjDecision.Denied;
                notes = "Duplicate claim detected within 30 days.";
                firedRules.Add("DuplicateCheck: DUPLICATE FOUND");
            }
            else firedRules.Add("DuplicateCheck: PASSED");

            // ── Create immutable AdjudicationRecord ──────
            var record = new AdjudicationRecord
            {
                ClaimID = claimId,
                ExecutedAt = DateTime.UtcNow,
                EngineVersion = "1.0.0",
                Decision = decision,
                AppliedRulesJSON = System.Text.Json.JsonSerializer.Serialize(firedRules),
                CalculationsJSON = System.Text.Json.JsonSerializer.Serialize(new
                {
                    BilledAmount = claim.TotalBilledAmount,
                    Deductible = claim.Member.Policy.DeductibleAmount,
                    ApprovedAmount = decision == AdjDecision.Paid
                        ? claim.TotalBilledAmount - (claim.Member.Policy.DeductibleAmount ?? 0)
                        : 0
                }),
                Notes = notes,
                PerformedByID = null  // null = auto
            };

            // ACID: Transaction ensures AdjudicationRecord + Claim status + AuditLog are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.AdjudicationRecords.Add(record);

                // Update claim status
                claim.Status = decision == AdjDecision.Paid ? ClaimStatus.Adjudicated
                             : decision == AdjDecision.Denied ? ClaimStatus.Rejected
                             : ClaimStatus.Validated; // PendingReview

                // Audit log
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = claim.ProviderID,
                    Action = "AutoAdjudication",
                    ResourceType = "Claim",
                    ResourceID = claimId.ToString(),
                    DetailsJSON = $"{{\"Decision\":\"{decision}\"}}",
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

            return CreatedAtAction(nameof(GetByClaimId), new { claimId }, record);
        }

        // POST: api/adjudication/manual
        // Insurance Staff manually adjudicates a claim
        [HttpPost("manual")]
        public async Task<ActionResult<AdjudicationRecord>> ManualAdjudicate(
            [FromBody] AdjudicationRecord record)
        {
            var claim = await _context.Claims.FindAsync(record.ClaimID);
            if (claim == null)
                return NotFound($"Claim {record.ClaimID} not found.");

            // ACID: Transaction ensures AdjudicationRecord + Claim status + AuditLog are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                record.ExecutedAt = DateTime.UtcNow;

                _context.AdjudicationRecords.Add(record);

                // Update claim status based on decision
                claim.Status = record.Decision == AdjDecision.Paid ? ClaimStatus.Adjudicated
                             : record.Decision == AdjDecision.Denied ? ClaimStatus.Rejected
                             : ClaimStatus.Validated;

                // Audit log
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = record.PerformedByID ?? 0,
                    Action = "ManualAdjudication",
                    ResourceType = "Claim",
                    ResourceID = record.ClaimID.ToString(),
                    DetailsJSON = $"{{\"Decision\":\"{record.Decision}\"}}",
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

            return Ok(record);
        }
    }
}