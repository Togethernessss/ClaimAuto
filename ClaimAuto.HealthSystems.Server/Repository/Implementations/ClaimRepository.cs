using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class ClaimRepository : IClaimRepository
    {
        private readonly ApplicationDbContext _context;

        public ClaimRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Claims ──────────────────────────────────────

        public async Task<List<Claim>> GetAllAsync()
        {
            return await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .ToListAsync();
        }

        public async Task<Claim?> GetByIdAsync(int id)
        {
            return await _context.Claims.FindAsync(id);
        }

        public async Task<Claim?> GetByIdDetailedAsync(int id)
        {
            return await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .Include(c => c.AdjudicationRecords)
                .Include(c => c.FraudScores)
                .FirstOrDefaultAsync(c => c.ClaimID == id);
        }

        public async Task<List<Claim>> GetByMemberAsync(int memberId)
        {
            return await _context.Claims
                .Where(c => c.MemberID == memberId)
                .Include(c => c.ClaimLines)
                .Include(c => c.Policy)
                .Include(c => c.Member)
                .Include(c => c.Provider)
                .OrderByDescending(c => c.SubmittedAt)
                .ToListAsync();
        }

        public async Task<List<Claim>> GetByStatusAsync(ClaimStatus status)
        {
            return await _context.Claims
                .Where(c => c.Status == status)
                .Include(c => c.Member)
                .Include(c => c.Provider)
                .OrderBy(c => c.Priority)
                .ThenBy(c => c.SubmittedAt)
                .ToListAsync();
        }

        public async Task<bool> ExternalRefExistsAsync(string externalRef)
        {
            return await _context.Claims
                .AnyAsync(c => c.ExternalClaimRef == externalRef);
        }

        public async Task CreateClaimWithAuditAsync(Claim claim, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Claims.Add(claim);
                await _context.SaveChangesAsync();

                log.ResourceID = claim.ClaimID.ToString();
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

        public async Task UpdateStatusAsync(Claim claim, ClaimStatus newStatus)
        {
            claim.Status = newStatus;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Claim claim)
        {
            _context.Claims.Remove(claim);
            await _context.SaveChangesAsync();
        }

        // ── Claim Lines ─────────────────────────────────

        public async Task<List<ClaimLine>> GetLinesByClaimAsync(int claimId)
        {
            return await _context.ClaimLines
                .Where(l => l.ClaimID == claimId)
                .ToListAsync();
        }

        public async Task<ClaimLine?> GetLineAsync(int claimId, int lineId)
        {
            return await _context.ClaimLines
                .FirstOrDefaultAsync(l => l.ClaimID == claimId && l.LineID == lineId);
        }

        public async Task AddLineAsync(ClaimLine line)
        {
            _context.ClaimLines.Add(line);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateLineAsync(ClaimLine line)
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteLineAsync(ClaimLine line)
        {
            _context.ClaimLines.Remove(line);
            await _context.SaveChangesAsync();
        }

        // ── Claim Documents ─────────────────────────────

        public async Task<List<ClaimDocument>> GetDocumentsByClaimAsync(int claimId)
        {
            return await _context.ClaimDocuments
                .Where(d => d.ClaimID == claimId)
                .Include(d => d.Uploader)
                .ToListAsync();
        }

        public async Task<ClaimDocument?> GetDocumentAsync(int claimId, int docId)
        {
            return await _context.ClaimDocuments
                .Include(d => d.Uploader)
                .Include(d => d.VerifiedBy)
                .FirstOrDefaultAsync(d => d.ClaimID == claimId && d.DocID == docId);
        }

        public async Task AddDocumentAsync(ClaimDocument doc)
        {
            _context.ClaimDocuments.Add(doc);
            await _context.SaveChangesAsync();
        }

        public async Task VerifyDocumentAsync(ClaimDocument doc, int verifiedByUserId)
        {
            doc.Status = DocStatus.Verified;
            doc.VerifiedByID = verifiedByUserId;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteDocumentAsync(ClaimDocument doc)
        {
            _context.ClaimDocuments.Remove(doc);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task LoadMemberAsync(Claim claim)
        {
            await _context.Entry(claim).Reference(c => c.Member).LoadAsync();
        }

        public async Task LoadProviderAsync(Claim claim)
        {
            await _context.Entry(claim).Reference(c => c.Provider).LoadAsync();
        }
    }
}


