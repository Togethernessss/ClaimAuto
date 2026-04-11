using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly ApplicationDbContext _context;

        public AuditLogRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<AuditLog>> GetAllAsync(int limit = 500)
        {
            return await _context.AuditLogs
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<AuditLog?> GetByIdAsync(int id)
        {
            return await _context.AuditLogs
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.AuditID == id);
        }

        public async Task<List<AuditLog>> GetByUserAsync(int userId)
        {
            return await _context.AuditLogs
                .Where(a => a.UserID == userId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        public async Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId)
        {
            return await _context.AuditLogs
                .Where(a => a.ResourceType == resourceType
                         && a.ResourceID == resourceId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        public async Task<List<AuditLog>> GetByActionAsync(string action)
        {
            return await _context.AuditLogs
                .Where(a => a.Action == action)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }
    }
}