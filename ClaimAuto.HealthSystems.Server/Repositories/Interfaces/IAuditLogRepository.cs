using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAuditLogRepository
    {
        /// GET /api/auditlogs
        // Returns audit logs with optional filters
        // Admin can filter by: who did it (userId), what type of record (resourceType), what action (action)
        // limit = max records to return — default 500, hard cap 1000
        Task<List<AuditLogResponseDto>> GetAllAsync(
            int? userId,
            string? resourceType,
            string? action,
            int limit);

        // GET /api/auditlogs/{id}
        // Returns one specific audit log entry by its ID
        Task<AuditLogResponseDto?> GetByIdAsync(int auditId);
    }
}
