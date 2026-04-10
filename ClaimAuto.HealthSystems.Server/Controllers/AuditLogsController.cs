using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
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
        private readonly ApplicationDbContext _context;

        public AuditLogsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/auditlogs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetAllLogs()
        {
            var logs = await _context.AuditLogs
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(500)
                .ToListAsync();

            return Ok(logs);
        }

        // GET: api/auditlogs/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AuditLog>> GetLog(int id)
        {
            var log = await _context.AuditLogs
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.AuditID == id);

            if (log == null)
                return NotFound($"Audit log with ID {id} not found.");

            return Ok(log);
        }

        // GET: api/auditlogs/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByUser(int userId)
        {
            var logs = await _context.AuditLogs
                .Where(a => a.UserID == userId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(logs);
        }

        // GET: api/auditlogs/resource/Claim/5
        [HttpGet("resource/{resourceType}/{resourceId}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByResource(
            string resourceType, string resourceId)
        {
            var logs = await _context.AuditLogs
                .Where(a => a.ResourceType == resourceType
                         && a.ResourceID == resourceId)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(logs);
        }

        // GET: api/auditlogs/action/CreateUser
        [HttpGet("action/{action}")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogsByAction(string action)
        {
            var logs = await _context.AuditLogs
                .Where(a => a.Action == action)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(logs);
        }
    }
}
