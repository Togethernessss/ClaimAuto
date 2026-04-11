using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class AppealRepository : IAppealRepository
    {
        private readonly ApplicationDbContext _context;

        public AppealRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Appeal>> GetAllWithDetailsAsync()
        {
            return await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .Include(a => a.DecisionBy)
                .ToListAsync();
        }

        public async Task<Appeal?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Appeals
                .Include(a => a.Claim)
                .Include(a => a.FiledByUser)
                .Include(a => a.DecisionBy)
                .FirstOrDefaultAsync(a => a.AppealID == id);
        }

        public async Task<Appeal?> GetByIdAsync(int id)
        {
            return await _context.Appeals.FindAsync(id);
        }

        public async Task CreateAppealWithAuditAsync(Appeal appeal, Tasks task, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Appeals.Add(appeal);
                await _context.SaveChangesAsync();

                log.ResourceID = appeal.AppealID.ToString();
                task.Description = $"Review appeal #{appeal.AppealID} for Claim #{appeal.ClaimID}. Reason: {appeal.Reason}";
                _context.Tasks.Add(task);
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

        public async Task DecideAppealWithAuditAsync(Appeal appeal, AuditLog log)
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

        public async Task LoadFiledByUserAsync(Appeal appeal)
        {
            await _context.Entry(appeal).Reference(a => a.FiledByUser).LoadAsync();
        }

        public async Task<List<Subrogation>> GetAllSubrogationsAsync()
        {
            return await _context.Subrogations
                .Include(s => s.Claim)
                .ToListAsync();
        }

        public async Task<Subrogation> CreateSubrogationAsync(Subrogation sub)
        {
            sub.InitiatedAt = DateTime.UtcNow;
            sub.Status = SubrogationStatus.Initiated;
            _context.Subrogations.Add(sub);
            await _context.SaveChangesAsync();
            return sub;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}