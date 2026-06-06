using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;// for ControllerBase, ApiController, Route, HttpGet, etc.

namespace ClaimAuto.HealthSystems.Server.Controllers
{   /// <summary>Provides read-only access to the system audit trail. Admin only.</summary>
    [ApiController]
    [Route("api/auditlogs")]
    [Authorize(Roles = "Admin")]
    [Produces("application/json")]
    public class AuditLogsController : BaseController
    {
        private readonly IAuditLogRepository _auditLogRepository;

        // DI injects IAuditLogRepository here automatically
        // because we register it in Program.cs (Step 4 below)
        public AuditLogsController(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        // GET /api/auditlogs 
        // Returns all audit logs — newest first
        // Optional filters via query params:
        //   ?userId=3            → only logs by user ID 3
        //   ?resourceType=Claim  → only logs where a Claim was affected
        //   ?action=CreateRule   → only logs for CreateRule action
        //   ?limit=100           → return max 100 records (default: 500)
        /// <summary>Returns all audit logs with optional filters. Max 1000 records per request.</summary>
        /// <param name="userId">Filter by user ID.</param>
        /// <param name="resourceType">Filter by resource type (e.g. Claim, User).</param>
        /// <param name="action">Filter by action name (e.g. Login, CreateRule).</param>
        /// <param name="limit">Max records to return (default 500, max 1000).</param>
        /// <response code="200">Returns list of audit log entries.</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int? userId,
            [FromQuery] string? resourceType,
            [FromQuery] string? action,
            [FromQuery] int limit = 500)
        {
            
            // Guard: if someone sends limit=0 or limit=99999, reset to safe default
            if (limit <= 0 || limit > 1000)
                limit = 500;

            var userOrgId = GetLoggedInUserOrgId();
            var logs = await _auditLogRepository.GetAllAsync(
                userId, resourceType, action, limit, userOrgId);

            return Ok(logs);
        }

        // GET /api/auditlogs/{id} 
        // Returns one specific audit log entry by its AuditID
        // Example: GET /api/auditlogs/47
        /// <summary>Returns a single audit log entry by its ID.</summary>
        /// <param name="id">The AuditLog ID.</param>
        /// <response code="200">Returns the audit log entry.</response>
        /// <response code="404">Audit log not found.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAuditLogById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var log = await _auditLogRepository.GetByIdAsync(id, userOrgId);

            // If no log with that ID exists — return 404
            if (log == null)
                return NotFound(new { message = $"Audit log with ID {id} not found." });

            return Ok(log);
        }
    }
}