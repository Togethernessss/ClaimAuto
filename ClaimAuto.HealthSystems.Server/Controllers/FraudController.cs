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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff handle fraud
    public class FraudController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private const decimal HIGH_RISK_THRESHOLD = 70.0m;

        public FraudController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/fraud/scores
        [HttpGet("scores")]
        public async Task<ActionResult<IEnumerable<FraudScore>>> GetAllScores()
        {
            var scores = await _context.FraudScores
                .Include(f => f.Claim)
                .OrderByDescending(f => f.ScoreValue)
                .ToListAsync();

            return Ok(scores);
        }

        // GET: api/fraud/cases
        [HttpGet("cases")]
        public async Task<ActionResult<IEnumerable<FraudCase>>> GetAllCases()
        {
            var cases = await _context.FraudCases
                .Include(f => f.Claim)
                .Include(f => f.OpenedByUser)
                .Where(f => f.Status != FraudCaseStatus.Resolved)
                .ToListAsync();

            return Ok(cases);
        }

        // POST: api/fraud/score/5
        // Run fraud scoring on a specific claim
        [HttpPost("score/{claimId}")]
        public async Task<ActionResult<FraudScore>> ScoreClaim(int claimId)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null)
                return NotFound($"Claim {claimId} not found.");

            // ── Rule-based fraud scoring ──────────────────
            decimal score = 0;
            var factors = new List<string>();

            // Factor 1: High billed amount
            if (claim.TotalBilledAmount > 200000)
            {
                score += 25;
                factors.Add("HighBilledAmount: +25");
            }

            // Factor 2: Weekend service date
            bool hasWeekendService = claim.ClaimLines
                .Any(l => l.ServiceDate.DayOfWeek == DayOfWeek.Saturday
                        || l.ServiceDate.DayOfWeek == DayOfWeek.Sunday);
            if (hasWeekendService)
            {
                score += 15;
                factors.Add("WeekendServiceDate: +15");
            }

            // Factor 3: Multiple claims from same provider in 7 days
            int recentFromProvider = await _context.Claims
                .CountAsync(c => c.ProviderID == claim.ProviderID
                              && c.SubmittedAt >= DateTime.UtcNow.AddDays(-7)
                              && c.ClaimID != claim.ClaimID);
            if (recentFromProvider >= 3)
            {
                score += 20;
                factors.Add($"FrequentProviderClaims({recentFromProvider} in 7 days): +20");
            }

            // Factor 4: Unusual number of line items
            if (claim.ClaimLines.Count > 10)
            {
                score += 15;
                factors.Add($"HighLineItemCount({claim.ClaimLines.Count}): +15");
            }

            var fraudScore = new FraudScore
            {
                ClaimID = claimId,
                ScoringModel = "RuleBasedV1",
                ScoreValue = Math.Min(score, 100),
                FactorsJSON = System.Text.Json.JsonSerializer.Serialize(factors),
                GeneratedAt = DateTime.UtcNow
            };

            // ACID: Transaction ensures FraudScore + FraudCase + Notification are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.FraudScores.Add(fraudScore);

                // Auto-create FraudCase and Notification if high risk
                if (fraudScore.ScoreValue >= HIGH_RISK_THRESHOLD)
                {
                    var fraudCase = new FraudCase
                    {
                        ClaimID = claimId,
                        OpenedAt = DateTime.UtcNow,
                        OpenedBy = 1, // System user — replace with actual staff ID
                        Priority = fraudScore.ScoreValue >= 90
                                        ? FraudCasePriority.Critical
                                        : FraudCasePriority.High,
                        Status = FraudCaseStatus.Open
                    };
                    _context.FraudCases.Add(fraudCase);

                    // Notify Insurance Staff
                    _context.Notifications.Add(new Notification
                    {
                        UserID = 1, // Replace with actual staff user ID
                        ClaimID = claimId,
                        Message = $"High fraud score ({fraudScore.ScoreValue}) on Claim #{claimId}. Immediate review required.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Critical,
                        CreatedAt = DateTime.UtcNow,
                        Status = NotificationStatus.Unread
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return Ok(fraudScore);
        }

        // PUT: api/fraud/cases/5/resolve
        // Insurance Staff resolves a fraud case
        [HttpPut("cases/{caseId}/resolve")]
        public async Task<IActionResult> ResolveCase(int caseId, [FromBody] FraudCase update)
        {
            var fraudCase = await _context.FraudCases.FindAsync(caseId);
            if (fraudCase == null)
                return NotFound($"Fraud case {caseId} not found.");

            // ACID: Transaction ensures FraudCase update + AuditLog are saved together
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                fraudCase.Status = FraudCaseStatus.Resolved;
                fraudCase.Outcome = update.Outcome;
                fraudCase.InvestigationNotes = update.InvestigationNotes;
                fraudCase.ResolvedAt = DateTime.UtcNow;

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = update.OpenedBy,
                    Action = "ResolveFraudCase",
                    ResourceType = "FraudCase",
                    ResourceID = caseId.ToString(),
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
    }
}
