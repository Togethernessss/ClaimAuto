using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAuditLogService
    {
        Task<List<AuditLog>> GetAllAsync(int limit = 500);
        Task<(bool Success, string Error, AuditLog? Log)> GetByIdAsync(int id);
        Task<List<AuditLog>> GetByUserAsync(int userId);
        Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId);
        Task<List<AuditLog>> GetByActionAsync(string action);

    }
}