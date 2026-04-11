using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IAuditLogRepository _repo;

        public AuditLogService(IAuditLogRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<AuditLog>> GetAllAsync(int limit = 500)
        {
            return await _repo.GetAllAsync(limit);
        }

        public async Task<(bool Success, string Error, AuditLog? Log)> GetByIdAsync(int id)
        {
            var log = await _repo.GetByIdAsync(id);
            if (log == null)
                return (false, $"Audit log with ID {id} not found.", null);

            return (true, "", log);
        }

        public async Task<List<AuditLog>> GetByUserAsync(int userId)
        {
            return await _repo.GetByUserAsync(userId);
        }

        public async Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId)
        {
            return await _repo.GetByResourceAsync(resourceType, resourceId);
        }

        public async Task<List<AuditLog>> GetByActionAsync(string action)
        {
            return await _repo.GetByActionAsync(action);
        }
    }
}