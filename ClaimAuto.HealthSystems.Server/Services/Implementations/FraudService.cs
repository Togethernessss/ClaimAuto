using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class FraudService: IFraudService
    {
        private readonly IFraudRepository _repo;
        private const decimal HIGH_RISK_THRESHOLD = 70.0m;

        public FraudService(IFraudRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<FraudScore>> GetAllScoresAsync()
        {
            return await _repo.GetAllScoresAsync();
        }

        public async Task<List<FraudCase>> GetOpenCasesAsync()
        {
            return await _repo.GetOpenCasesAsync();
        }

        public async Task<(bool Success, string Error, FraudScore? Score)> ScoreClaimAsync(int claimId)
        {
            var claim = await _repo.GetClaimWithLinesAsync(claimId);
            if (claim == null)
                return (false, $"Claim {claimId} not found.", null);

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
            int recentFromProvider = await _repo.CountRecentProviderClaimsAsync(
                claim.ProviderID, claim.ClaimID);
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

            FraudCase? fraudCase = null;
            Notification? notification = null;

            if (fraudScore.ScoreValue >= HIGH_RISK_THRESHOLD)
            {
                fraudCase = new FraudCase
                {
                    ClaimID = claimId,
                    OpenedAt = DateTime.UtcNow,
                    OpenedBy = 1,
                    Priority = fraudScore.ScoreValue >= 90
                                    ? FraudCasePriority.Critical
                                    : FraudCasePriority.High,
                    Status = FraudCaseStatus.Open
                };

                notification = new Notification
                {
                    UserID = 1,
                    ClaimID = claimId,
                    Message = $"High fraud score ({fraudScore.ScoreValue}) on Claim #{claimId}. Immediate review required.",
                    Category = NotificationCategory.Exception,
                    Severity = NotificationSeverity.Critical,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread
                };
            }

            await _repo.CreateScoreWithCaseAsync(fraudScore, fraudCase, notification);
            return (true, "", fraudScore);
        }

        public async Task<(bool Success, string Error)> ResolveCaseAsync(int caseId, FraudCase update)
        {
            var fraudCase = await _repo.GetCaseByIdAsync(caseId);
            if (fraudCase == null)
                return (false, $"Fraud case {caseId} not found.");

            fraudCase.Status = FraudCaseStatus.Resolved;
            fraudCase.Outcome = update.Outcome;
            fraudCase.InvestigationNotes = update.InvestigationNotes;
            fraudCase.ResolvedAt = DateTime.UtcNow;

            var log = new AuditLog
            {
                UserID = update.OpenedBy,
                Action = "ResolveFraudCase",
                ResourceType = "FraudCase",
                ResourceID = caseId.ToString(),
                Timestamp = DateTime.UtcNow
            };

            await _repo.ResolveCaseWithAuditAsync(fraudCase, log);
            return (true, "");
        }
    }
}