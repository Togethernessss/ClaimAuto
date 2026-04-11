using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]  // ← Only Admin manages rules
    public class RulesController : ControllerBase
    {
        private readonly IRuleService _service;

        public RulesController(IRuleService service)
        {
            _service = service;
        }

        // GET: api/rules
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetAllRules()
        {
            var rules = await _service.GetAllAsync();
            return Ok(rules);
        }

        // GET: api/rules/5
        [HttpGet("{id}")]
        public async Task<ActionResult<RuleResponseDto>> GetRule(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Rule);
        }

        // GET: api/rules/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetActiveRules()
        {
            var rules = await _service.GetActiveAsync();
            return Ok(rules);
        }

        // GET: api/rules/type/Coverage
        [HttpGet("type/{ruleType}")]
        public async Task<ActionResult<IEnumerable<RuleResponseDto>>> GetRulesByType(RuleType ruleType)
        {
            var rules = await _service.GetByTypeAsync(ruleType);
            return Ok(rules);
        }

        // POST: api/rules
        [HttpPost]
        public async Task<ActionResult<RuleResponseDto>> CreateRule(CreateRuleDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int currentUserId = int.Parse(userIdClaim!.Value);

            var result = await _service.CreateAsync(dto, currentUserId);
            if (!result.Success)
                return BadRequest(result.Error);

            return CreatedAtAction(nameof(GetRule), new { id = result.Rule!.RuleID }, result.Rule);
        }

        // PUT: api/rules/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id, UpdateRuleDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return NoContent();
        }

        // PUT: api/rules/5/activate
        [HttpPut("{id}/activate")]
        public async Task<IActionResult> ActivateRule(int id)
        {
            var result = await _service.ActivateAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // PUT: api/rules/5/deactivate
        [HttpPut("{id}/deactivate")]
        public async Task<IActionResult> DeactivateRule(int id)
        {
            var result = await _service.DeactivateAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // DELETE: api/rules/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}

