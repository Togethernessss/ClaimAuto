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
        private readonly INotificationRepository _notificationRepo;

        public FraudRepository(
            ApplicationDbContext context,
            INotificationRepository notificationRepo)
        {
            _context = context;
            _notificationRepo = notificationRepo;
        }

        public async Task<FraudScore?> GetFraudScoreByClaimIdAsync(int claimId, int? userOrgId = null)
        {
            var query = _context.FraudScores.Where(fs => fs.ClaimID == claimId);
            if (userOrgId.HasValue)
                query = query.Where(fs => fs.OrganizationID == userOrgId.Value);
            return await query.FirstOrDefaultAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  SCORE CLAIM — 5-factor fraud engine, stamps tenant (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<FraudScore> ScoreClaimAsync(int claimId, int? userOrgId = null)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null)
                throw new Exception($"Claim {claimId} not found.");

            var factors = new List<string>();
            decimal scoreValue = 0;

            var thisClaimServiceCodes = claim.ClaimLines
                .Select(cl => cl.ServiceCode)
                .ToList();

            // Factor 1: duplicate service code
            var hasDuplicateServiceCode = await _context.ClaimLines
            .Where(cl => cl.Claim.MemberID == claim.MemberID
                && cl.Claim.OrganizationID == claim.OrganizationID
                && cl.ClaimID != claimId
                && thisClaimServiceCodes.Contains(cl.ServiceCode))
            .AnyAsync();

            if (hasDuplicateServiceCode)
            {
                factors.Add("duplicate_service_code");
                scoreValue += 25;
            }

            // Factor 2: provider high billing frequency in last 30 days
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var providerClaimCount = await _context.Claims
            .Where(c => c.ProviderID == claim.ProviderID
                && c.OrganizationID == claim.OrganizationID
                && c.SubmittedAt >= thirtyDaysAgo)
            .CountAsync();

            if (providerClaimCount > 10)
            {
                factors.Add("high_billing_frequency");
                scoreValue += 20;
            }

            // Factor 3: amount spike (≥300% of provider's average)
            var providerAvg = await _context.Claims
                .Where(c => c.ProviderID == claim.ProviderID
                    && c.OrganizationID == claim.OrganizationID
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

            // Factor 4 & 5: first-time provider OR repeated procedure pattern
            var providerTotalClaims = await _context.Claims
            .Where(c => c.ProviderID == claim.ProviderID
                && c.OrganizationID == claim.OrganizationID)
            .CountAsync();

            if (providerTotalClaims <= 1)
            {
                factors.Add("first_time_provider");
            }
            else
            {
                var hasRepeatedProcedure = await _context.ClaimLines
                .Where(cl => cl.Claim.ProviderID == claim.ProviderID
                    && cl.Claim.OrganizationID == claim.OrganizationID
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

            scoreValue = Math.Min(scoreValue, 100);

            var fraudScore = new FraudScore
            {
                ClaimID = claimId,
                ScoringModel = "RuleBasedV1",
                ScoreValue = scoreValue,
                FactorsJSON = JsonSerializer.Serialize(factors),
                GeneratedAt = DateTime.UtcNow,
                OrganizationID = userOrgId,   // ← Phase 4: tenant stamp
            };

            _context.FraudScores.Add(fraudScore);
            await _context.SaveChangesAsync();
            return fraudScore;
        }

        public async Task<List<FraudCase>> GetAllFraudCasesAsync(
            string? status, string? priority, int? userOrgId = null)
        {
            var query = _context.FraudCases.AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(fc => fc.OrganizationID == userOrgId.Value);

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

        public async Task<FraudCase?> GetFraudCaseByIdAsync(int id, int? userOrgId = null)
        {
            var query = _context.FraudCases.Where(fc => fc.CaseID == id);
            if (userOrgId.HasValue)
                query = query.Where(fc => fc.OrganizationID == userOrgId.Value);
            return await query.FirstOrDefaultAsync();
        }

        public async Task<FraudCase?> GetFraudCaseByClaimIdAsync(int claimId, int? userOrgId = null)
        {
            var query = _context.FraudCases.Where(fc => fc.ClaimID == claimId);
            if (userOrgId.HasValue)
                query = query.Where(fc => fc.OrganizationID == userOrgId.Value);
            return await query.FirstOrDefaultAsync();
        }

        public async Task<FraudCase> CreateFraudCaseAsync(FraudCase fraudCase)
        {
            _context.FraudCases.Add(fraudCase);
            await _context.SaveChangesAsync();
            return fraudCase;
        }

        public async Task<FraudCase> CreateFraudCaseWithNotificationAsync(
            FraudCase fraudCase, Notification notification)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.FraudCases.Add(fraudCase);
                await _context.SaveChangesAsync();

                await _notificationRepo.CreateAsync(notification);

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
            int id, ResolveFraudCaseDto dto, int? userOrgId = null)
        {
            var query = _context.FraudCases.Where(fc => fc.CaseID == id);
            if (userOrgId.HasValue)
                query = query.Where(fc => fc.OrganizationID == userOrgId.Value);
            var fraudCase = await query.FirstOrDefaultAsync();

            if (fraudCase == null) return null;

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