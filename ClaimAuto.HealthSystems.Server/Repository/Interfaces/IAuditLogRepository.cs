using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IAuditLogRepository
    {
        Task<List<AuditLog>> GetAllAsync(int limit = 500);
        Task<AuditLog?> GetByIdAsync(int id);
        Task<List<AuditLog>> GetByUserAsync(int userId);
        Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId);
        Task<List<AuditLog>> GetByActionAsync(string action);
    }
}
