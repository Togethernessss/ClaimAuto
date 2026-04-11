using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]  // ← Only Admin can view audit logs
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _service;

        public AuditLogsController(IAuditLogService service)
        {
            _service = service;
        }

        // GET: api/auditlogs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetAllLogs()
        {
            var logs = await _service.GetAllAsync();
            return Ok(logs);
        }

        // GET: api/auditlogs/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AuditLog>> GetLog(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Log);
        }

        // GET: api/auditlogs/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByUser(int userId)
        {
            var logs = await _service.GetByUserAsync(userId);
            return Ok(logs);
        }

        // GET: api/auditlogs/resource/Claim/5
        [HttpGet("resource/{resourceType}/{resourceId}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByResource(
            string resourceType, string resourceId)
        {
            var logs = await _service.GetByResourceAsync(resourceType, resourceId);
            return Ok(logs);
        }

        // GET: api/auditlogs/action/CreateUser
        [HttpGet("action/{action}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByAction(string action)
        {
            var logs = await _service.GetByActionAsync(action);
            return Ok(logs);
        }
    }
}
