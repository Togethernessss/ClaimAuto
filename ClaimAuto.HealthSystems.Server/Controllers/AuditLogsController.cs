using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/auditlogs")]
    [Authorize(Roles = "Admin")]
    public class AuditLogsController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId,
        [FromQuery] string? resourceType,
        [FromQuery] string? action,
        [FromQuery] int limit = 500)
        { }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetAuditLogById(int id) { }
    }
}
