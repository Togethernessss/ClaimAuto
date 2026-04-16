using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/auditlogs")]
    [Authorize(Roles = "Admin")]
    public class AuditLogsController : BaseController
    {
        private readonly IAuditLogRepository _auditLogRepository;

        // DI injects IAuditLogRepository here automatically
        // because we register it in Program.cs (Step 4 below)
        public AuditLogsController(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        // ── GET /api/auditlogs ──────────────────────────────────────────
        // Returns all audit logs — newest first
        // Optional filters via query params:
        //   ?userId=3            → only logs by user ID 3
        //   ?resourceType=Claim  → only logs where a Claim was affected
        //   ?action=CreateRule   → only logs for CreateRule action
        //   ?limit=100           → return max 100 records (default: 500)
        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int? userId,
            [FromQuery] string? resourceType,
            [FromQuery] string? action,
            [FromQuery] int limit = 500)
        {
            // Guard: if someone sends limit=0 or limit=99999, reset to safe default
            if (limit <= 0 || limit > 1000)
                limit = 500;

            var logs = await _auditLogRepository.GetAllAsync(
                userId, resourceType, action, limit);

            return Ok(logs);
        }

        // ── GET /api/auditlogs/{id} ─────────────────────────────────────
        // Returns one specific audit log entry by its AuditID
        // Example: GET /api/auditlogs/47
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAuditLogById(int id)
        {
            var log = await _auditLogRepository.GetByIdAsync(id);

            // If no log with that ID exists — return 404
            if (log == null)
                return NotFound(new { message = $"Audit log with ID {id} not found." });

            return Ok(log);
        }
    }
}