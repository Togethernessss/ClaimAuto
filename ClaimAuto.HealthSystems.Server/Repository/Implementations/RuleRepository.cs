using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;


namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class RuleRepository : IRuleRepository
    {
        private readonly ApplicationDbContext _context;

        public RuleRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Rule>> GetAllWithCreatorAsync()
        {
            return await _context.Rules
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();
        }

        public async Task<Rule?> GetByIdWithCreatorAsync(int id)
        {
            return await _context.Rules
                .Include(r => r.CreatedByUser)
                .FirstOrDefaultAsync(r => r.RuleID == id);
        }

        public async Task<List<Rule>> GetActiveWithCreatorAsync()
        {
            return await _context.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();
        }

        public async Task<List<Rule>> GetByTypeWithCreatorAsync(RuleType ruleType)
        {
            return await _context.Rules
                .Where(r => r.RuleType == ruleType)
                .Include(r => r.CreatedByUser)
                .OrderBy(r => r.Priority)
                .ToListAsync();
        }

        public async Task CreateRuleWithAuditAsync(Rule rule, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Rules.Add(rule);
                await _context.SaveChangesAsync();

                log.ResourceID = rule.RuleID.ToString();
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

        public async Task LoadCreatorAsync(Rule rule)
        {
            await _context.Entry(rule).Reference(r => r.CreatedByUser).LoadAsync();
        }

        public async Task<Rule?> GetByIdAsync(int id)
        {
            return await _context.Rules.FindAsync(id);
        }

        public async Task UpdateAsync(Rule rule)
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Rule rule)
        {
            _context.Rules.Remove(rule);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}