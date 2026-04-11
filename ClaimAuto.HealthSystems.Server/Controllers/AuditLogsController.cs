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
        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId,
        [FromQuery] string? resourceType,
        [FromQuery] string? action,
        [FromQuery] int limit = 500)
        {
            throw new NotImplementedException();
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetAuditLogById(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
