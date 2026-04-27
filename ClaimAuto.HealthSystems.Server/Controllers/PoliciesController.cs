using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/policies")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class PoliciesController : BaseController
    {
        private readonly IPolicyRepository _policyRepo;

        public PoliciesController(IPolicyRepository policyRepo)
        {
            _policyRepo = policyRepo;
        }


        [HttpGet("active")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        public async Task<IActionResult> GetActivePolicies()
        {
            var policies = await _policyRepo.GetActivePoliciesAsync();
            return Ok(policies);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPolicies()
        {
            var policies = await _policyRepo.GetAllPoliciesAsync();
            return Ok(policies);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPolicyById(int id)
        {
            var policy = await _policyRepo.GetPolicyByIdAsync(id);
            if (policy == null)
                return NotFound($"Policy with ID {id} was not found.");
            return Ok(policy);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreatePolicy([FromBody] CreatePolicyDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var exists = await _policyRepo.PlanCodeExistsAsync(dto.PlanCode);
            if (exists)
                return Conflict($"A policy with PlanCode '{dto.PlanCode}' already exists.");

            var created = await _policyRepo.CreatePolicyAsync(dto, userId.Value);
            return CreatedAtAction(nameof(GetPolicyById), new { id = created.PolicyID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(int id, [FromBody] UpdatePolicyDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var updated = await _policyRepo.UpdatePolicyAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Policy with ID {id} was not found.");

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivatePolicy(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var result = await _policyRepo.DeactivatePolicyAsync(id, userId.Value);

            return result switch
            {
                "ok" => Ok($"Policy {id} has been deactivated successfully."),
                "notfound" => NotFound($"Policy with ID {id} was not found."),
                "alreadyexpired" => BadRequest($"Policy {id} is already expired."),
                "hasmembers" => BadRequest(
                                        $"Cannot deactivate Policy {id} — " +
                                        $"it has active members enrolled. " +
                                        $"Please move members to another policy first."),
                _ => StatusCode(500, "Unexpected error during deactivation.")
            };
        }
    }
}