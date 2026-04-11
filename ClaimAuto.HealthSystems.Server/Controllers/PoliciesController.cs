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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff manage policies
    public class PoliciesController : ControllerBase
    {
        private readonly IPolicyService _service;

        public PoliciesController(IPolicyService service)
        {
            _service = service;
        }

        // GET: api/policies
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PolicyResponseDto>>> GetAllPolicies()
        {
            var policies = await _service.GetAllAsync();
            return Ok(policies);
        }

        // GET: api/policies/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PolicyResponseDto>> GetPolicy(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Policy);
        }

        // GET: api/policies/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<PolicyResponseDto>>> GetActivePolicies()
        {
            var policies = await _service.GetActiveAsync();
            return Ok(policies);
        }

        // POST: api/policies
        [HttpPost]
        public async Task<ActionResult<PolicyResponseDto>> CreatePolicy(CreatePolicyDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetPolicy), new { id = response.PolicyID }, response);
        }

        // PUT: api/policies/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePolicy(int id, UpdatePolicyDto dto)
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

        // DELETE: api/policies/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePolicy(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}