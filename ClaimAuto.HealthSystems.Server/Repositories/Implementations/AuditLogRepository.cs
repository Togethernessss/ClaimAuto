using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly ApplicationDbContext _db;

        // ApplicationDbContext is injected by DI — same pattern as every other repository
        public AuditLogRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<AuditLogResponseDto>> GetAllAsync(
    int? userId,
    string? resourceType,
    string? action,
    int limit,
    int? userOrgId = null)
        {
            // Start with ALL audit logs — we will narrow it down below
            // Include(a => a.User) does a JOIN with the Users table
            // so we can resolve the UserName from UserID
            var query = _db.AuditLogs
                .Include(a => a.User)
                .AsQueryable();

            // ── Multi-tenant filter (Phase 3) ────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(a =>
                    a.OrganizationID == userOrgId.Value ||
                    (a.OrganizationID == null && a.User.OrganizationID == userOrgId.Value));
            // FILTER 1 — If caller passes ?userId=3, show only logs for that user
            // Example: Admin wants to see everything "Staff John" has done
            if (userId.HasValue)
                query = query.Where(a => a.UserID == userId.Value);

            // FILTER 2 — If caller passes ?resourceType=Claim, show only Claim-related logs
            // ResourceType is what ALL other repositories write — "Claim", "Policy", "Rule", "User" etc.
            if (!string.IsNullOrEmpty(resourceType))
                query = query.Where(a => a.ResourceType == resourceType);

            // FILTER 3 — If caller passes ?action=DeleteClaim, show only that specific action
            // Action is what all other repositories write — "CreateRule", "UpdateClaim", "ActivateRule" etc.
            if (!string.IsNullOrEmpty(action))
                query = query.Where(a => a.Action == action);

            // Always return newest logs first (most recent activity at the top)
            // Take(limit) ensures we never accidentally return 50,000 rows
            return await query
                .OrderByDescending(a => a.Timestamp)
                .Take(limit)
                .Select(a => new AuditLogResponseDto
                {
                    AuditID = a.AuditID,
                    UserID = a.UserID,
                    UserName = a.User.Name,   // resolved from the JOIN — e.g. "Ananya Singh"
                    Action = a.Action,       // e.g. "CreateRule", "UpdateClaim"
                    ResourceType = a.ResourceType, // e.g. "Rule", "Claim", "Policy"
                    ResourceID = a.ResourceID,   // e.g. "42" (the actual record ID affected)
                    DetailsJSON = a.DetailsJSON,  // full JSON of what changed
                    Timestamp = a.Timestamp
                })
                .ToListAsync();
        }

        public async Task<AuditLogResponseDto?> GetByIdAsync(int auditId, int? userOrgId = null)
        {
            // Find one specific audit log by its own ID
            // Useful when Admin clicks on a specific log entry to see full details
            var query = _db.AuditLogs
                .Include(a => a.User)
                .Where(a => a.AuditID == auditId);

            if (userOrgId.HasValue)
                query = query.Where(a =>
                    a.OrganizationID == userOrgId.Value ||
                    (a.OrganizationID == null && a.User.OrganizationID == userOrgId.Value));
            return await query
                .Select(a => new AuditLogResponseDto
                {
                    AuditID = a.AuditID,
                    UserID = a.UserID,
                    UserName = a.User.Name,
                    Action = a.Action,
                    ResourceType = a.ResourceType,
                    ResourceID = a.ResourceID,
                    DetailsJSON = a.DetailsJSON,
                    Timestamp = a.Timestamp
                })
                .FirstOrDefaultAsync();
        }
    }
}