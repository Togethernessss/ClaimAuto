using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]  // ← Any authenticated user (Policyholder/Hospital can file appeals)
    public class AppealsController : ControllerBase
    {
        private readonly IAppealService _service;

        public AppealsController(IAppealService service)
        {
            _service = service;
        }

        // GET: api/appeals
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppealResponseDto>>> GetAllAppeals()
        {
            var appeals = await _service.GetAllAsync();
            return Ok(appeals);
        }

        // GET: api/appeals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AppealResponseDto>> GetAppeal(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Appeal);
        }

        // POST: api/appeals
        [HttpPost]
        public async Task<ActionResult<AppealResponseDto>> FileAppeal(CreateAppealDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int filedByUserId = int.Parse(userIdClaim!.Value);

            var result = await _service.FileAppealAsync(dto, filedByUserId);
            if (!result.Success)
                return BadRequest(result.Error);

            return CreatedAtAction(nameof(GetAppeal), new { id = result.Appeal!.AppealID }, result.Appeal);
        }

        // PUT: api/appeals/5/decide
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] DecideAppealDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int decisionByUserId = int.Parse(userIdClaim!.Value);

            var result = await _service.DecideAppealAsync(id, dto, decisionByUserId);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return NoContent();
        }

        // GET: api/appeals/subrogations
        [HttpGet("subrogations")]
        public async Task<ActionResult<IEnumerable<Subrogation>>> GetSubrogations()
        {
            var subs = await _service.GetAllSubrogationsAsync();
            return Ok(subs);
        }

        // POST: api/appeals/subrogations
        [HttpPost("subrogations")]
        public async Task<ActionResult<Subrogation>> CreateSubrogation(Subrogation sub)
        {
            var result = await _service.CreateSubrogationAsync(sub);
            return Ok(result);
        }
    }
}