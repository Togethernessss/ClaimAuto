using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class AdjudicationRepository : IAdjudicationRepository
    {
        private readonly ApplicationDbContext _context;

        public AdjudicationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<AdjudicationRecord>> GetAllWithDetailsAsync()
        {
            return await _context.AdjudicationRecords
                .Include(a => a.Claim)
                .Include(a => a.PerformedBy)
                .ToListAsync();
        }

        public async Task<List<AdjudicationRecord>> GetByClaimIdAsync(int claimId)
        {
            return await _context.AdjudicationRecords
                .Where(a => a.ClaimID == claimId)
                .OrderByDescending(a => a.ExecutedAt)
                .ToListAsync();
        }

        public async Task<Claim?> GetClaimWithDetailsAsync(int claimId)
        {
            return await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.Member)
                    .ThenInclude(m => m.Policy)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);
        }

        public async Task<List<Rule>> GetActiveRulesAsync()
        {
            return await _context.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .OrderBy(r => r.Priority)
                .ToListAsync();
        }

        public async Task<bool> IsDuplicateClaimAsync(int memberId, decimal amount, int claimId)
        {
            return await _context.Claims
                .AnyAsync(c => c.MemberID == memberId
                            && c.TotalBilledAmount == amount
                            && c.ClaimID != claimId
                            && c.SubmittedAt >= DateTime.UtcNow.AddDays(-30));
        }

        public async Task AutoAdjudicateAsync(AdjudicationRecord record, Claim claim, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.AdjudicationRecords.Add(record);

                claim.Status = record.Decision == AdjDecision.Paid ? ClaimStatus.Adjudicated
                             : record.Decision == AdjDecision.Denied ? ClaimStatus.Rejected
                             : ClaimStatus.Validated;

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

        public async Task ManualAdjudicateAsync(AdjudicationRecord record, Claim claim, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                record.ExecutedAt = DateTime.UtcNow;
                _context.AdjudicationRecords.Add(record);

                claim.Status = record.Decision == AdjDecision.Paid ? ClaimStatus.Adjudicated
                             : record.Decision == AdjDecision.Denied ? ClaimStatus.Rejected
                             : ClaimStatus.Validated;

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