using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class FraudRepository : IFraudRepository
    {
        private readonly ApplicationDbContext _context;

        public FraudRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ══════════════════════════════════════════════════
        // GET FRAUD SCORE BY CLAIM ID
        // ══════════════════════════════════════════════════
        public async Task<FraudScore?> GetFraudScoreByClaimIdAsync(int claimId)
        {
            return await _context.FraudScores
                .FirstOrDefaultAsync(fs => fs.ClaimID == claimId);
        }

        // ══════════════════════════════════════════════════
        // 4-FACTOR FRAUD SCORING ENGINE
        // ══════════════════════════════════════════════════
        // Factor 1: Duplicate service code           → +25
        // Factor 2: High billing frequency (>10/30d) → +20
        // Factor 3: Amount spike (300%+ above avg)   → +20
        // Factor 4: Repeated procedure pattern       → +15
        // Score 0-30 = Clean, 31-69 = Medium, 70+ = High
        // ══════════════════════════════════════════════════
        public async Task<FraudScore> ScoreClaimAsync(int claimId)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null)
                throw new Exception($"Claim {claimId} not found.");

            var factors = new List<string>();
            decimal scoreValue = 0;

            // ── FACTOR 1: Duplicate Service Code (+25) ──
            var thisClaimServiceCodes = claim.ClaimLines
                .Select(cl => cl.ServiceCode)
                .ToList();

            var hasDuplicateServiceCode = await _context.ClaimLines
                .Where(cl => cl.Claim.MemberID == claim.MemberID
                    && cl.ClaimID != claimId
                    && thisClaimServiceCodes.Contains(cl.ServiceCode))
                .AnyAsync();

            if (hasDuplicateServiceCode)
            {
                factors.Add("duplicate_service_code");
                scoreValue += 25;
            }

            // ── FACTOR 2: High Billing Frequency (+20) ──
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var providerClaimCount = await _context.Claims
                .Where(c => c.ProviderID == claim.ProviderID
                    && c.SubmittedAt >= thirtyDaysAgo)
                .CountAsync();

            if (providerClaimCount > 10)
            {
                factors.Add("high_billing_frequency");
                scoreValue += 20;
            }

            // ── FACTOR 3: Amount Spike 300% Above Avg (+20) ──
            var providerAvg = await _context.Claims
                .Where(c => c.ProviderID == claim.ProviderID
                    && c.ClaimID != claimId)
                .AverageAsync(c => (decimal?)c.TotalBilledAmount);

            if (providerAvg.HasValue && providerAvg.Value > 0)
            {
                decimal percentageOfAvg = (claim.TotalBilledAmount / providerAvg.Value) * 100;
                if (percentageOfAvg >= 300)
                {
                    factors.Add("amount_spike_300pct");
                    scoreValue += 20;
                }
            }

            // ── FACTOR 4: Known Risk Indicators (+15 or 0) ──
            var providerTotalClaims = await _context.Claims
                .Where(c => c.ProviderID == claim.ProviderID)
                .CountAsync();

            if (providerTotalClaims <= 1)
            {
                factors.Add("first_time_provider");
            }
            else
            {
                var hasRepeatedProcedure = await _context.ClaimLines
                    .Where(cl => cl.Claim.ProviderID == claim.ProviderID
                        && cl.ClaimID != claimId
                        && thisClaimServiceCodes.Contains(cl.ServiceCode))
                    .GroupBy(cl => cl.ServiceCode)
                    .AnyAsync(g => g.Count() >= 3);

                if (hasRepeatedProcedure)
                {
                    factors.Add("repeated_procedure_pattern");
                    scoreValue += 15;
                }
            }

            // ── Cap and Save ──
            scoreValue = Math.Min(scoreValue, 100);

            var fraudScore = new FraudScore
            {
                ClaimID = claimId,
                ScoringModel = "RuleBasedV1",
                ScoreValue = scoreValue,
                FactorsJSON = JsonSerializer.Serialize(factors),
                GeneratedAt = DateTime.UtcNow
            };

            _context.FraudScores.Add(fraudScore);
            await _context.SaveChangesAsync();
            return fraudScore;
        }

        // ══════════════════════════════════════════════════
        // FRAUD CASE METHODS
        // ══════════════════════════════════════════════════

        public async Task<List<FraudCase>> GetAllFraudCasesAsync(
            string? status, string? priority)
        {
            var query = _context.FraudCases.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<FraudCaseStatus>(status, true, out var parsedStatus))
                    query = query.Where(fc => fc.Status == parsedStatus);
            }

            if (!string.IsNullOrEmpty(priority))
            {
                if (Enum.TryParse<FraudCasePriority>(priority, true, out var parsedPriority))
                    query = query.Where(fc => fc.Priority == parsedPriority);
            }

            return await query
                .OrderByDescending(fc => fc.OpenedAt)
                .ToListAsync();
        }

        public async Task<FraudCase?> GetFraudCaseByIdAsync(int id)
        {
            return await _context.FraudCases.FindAsync(id);
        }

        public async Task<FraudCase?> GetFraudCaseByClaimIdAsync(int claimId)
        {
            return await _context.FraudCases
                .FirstOrDefaultAsync(fc => fc.ClaimID == claimId);
        }

        public async Task<FraudCase> CreateFraudCaseAsync(FraudCase fraudCase)
        {
            _context.FraudCases.Add(fraudCase);
            await _context.SaveChangesAsync();
            return fraudCase;
        }

        // ── ACID: FraudCase + Notification together ──
        public async Task<FraudCase> CreateFraudCaseWithNotificationAsync(
            FraudCase fraudCase, Notification notification)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.FraudCases.Add(fraudCase);
                await _context.SaveChangesAsync();

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return fraudCase;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<FraudCase?> ResolveFraudCaseAsync(
            int id, ResolveFraudCaseDto dto)
        {
            var fraudCase = await _context.FraudCases
                .FirstOrDefaultAsync(fc => fc.CaseID == id);

            if (fraudCase == null) return null;

            // Parse outcome string → enum
            if (Enum.TryParse<FraudOutcome>(dto.Outcome, true, out var parsedOutcome))
            {
                fraudCase.Outcome = parsedOutcome;
                fraudCase.Status = parsedOutcome == FraudOutcome.Escalated
                    ? FraudCaseStatus.Escalated
                    : FraudCaseStatus.Resolved;
            }

            fraudCase.ResolvedAt = DateTime.UtcNow;

            if (dto.InvestigationNotes != null)
                fraudCase.InvestigationNotes = dto.InvestigationNotes;

            if (dto.EvidenceURIsJSON != null)
                fraudCase.EvidenceURIsJSON = dto.EvidenceURIsJSON;

            await _context.SaveChangesAsync();
            return fraudCase;
        }
    }
}