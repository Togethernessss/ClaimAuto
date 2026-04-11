using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class FraudRepository : IFraudRepository
    {
        private readonly ApplicationDbContext _context;

        public FraudRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<FraudScore>> GetAllScoresAsync()
        {
            return await _context.FraudScores
                .Include(f => f.Claim)
                .OrderByDescending(f => f.ScoreValue)
                .ToListAsync();
        }

        public async Task<List<FraudCase>> GetOpenCasesAsync()
        {
            return await _context.FraudCases
                .Include(f => f.Claim)
                .Include(f => f.OpenedByUser)
                .Where(f => f.Status != FraudCaseStatus.Resolved)
                .ToListAsync();
        }

        public async Task<Claim?> GetClaimWithLinesAsync(int claimId)
        {
            return await _context.Claims
                .Include(c => c.ClaimLines)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);
        }

        public async Task<int> CountRecentProviderClaimsAsync(int providerId, int excludeClaimId)
        {
            return await _context.Claims
                .CountAsync(c => c.ProviderID == providerId
                              && c.SubmittedAt >= DateTime.UtcNow.AddDays(-7)
                              && c.ClaimID != excludeClaimId);
        }

        public async Task CreateScoreWithCaseAsync(FraudScore score, FraudCase? fraudCase, Notification? notification)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.FraudScores.Add(score);

                if (fraudCase != null)
                    _context.FraudCases.Add(fraudCase);

                if (notification != null)
                    _context.Notifications.Add(notification);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<FraudCase?> GetCaseByIdAsync(int caseId)
        {
            return await _context.FraudCases.FindAsync(caseId);
        }

        public async Task ResolveCaseWithAuditAsync(FraudCase fraudCase, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.AuditLogs.Add(log);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}