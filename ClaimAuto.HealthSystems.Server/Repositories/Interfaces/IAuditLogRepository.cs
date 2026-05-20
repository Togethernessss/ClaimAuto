using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAuditLogRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's audit logs.
        Task<List<AuditLogResponseDto>> GetAllAsync(
            int? userId,
            string? resourceType,
            string? action,
            int limit,
            int? userOrgId = null);

        Task<AuditLogResponseDto?> GetByIdAsync(int auditId, int? userOrgId = null);
    }
}

