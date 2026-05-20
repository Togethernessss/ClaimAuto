using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages insurance policies.</summary>
    [ApiController]
    [Route("api/policies")]
    [Authorize]
    [Produces("application/json")]
    public class PoliciesController : BaseController
    {
        private readonly IPolicyRepository _policyRepo;

        public PoliciesController(IPolicyRepository policyRepo)
        {
            _policyRepo = policyRepo;
        }

        [HttpGet("active")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital,Policyholder")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetActivePolicies()
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();

            if (userRole == "Policyholder" && userId.HasValue)
            {
                var policies = await _policyRepo.GetPoliciesForPolicyholderAsync(userId.Value);
                return Ok(policies);
            }

            var userOrgId = GetLoggedInUserOrgId();
            var allActive = await _policyRepo.GetActivePoliciesAsync(userOrgId);
            return Ok(allActive);
        }

        [HttpGet]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllPolicies()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var policies = await _policyRepo.GetAllPoliciesAsync(userOrgId);
            return Ok(policies);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPolicyById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var policy = await _policyRepo.GetPolicyByIdAsync(id, userOrgId);
            if (policy == null)
                return NotFound($"Policy with ID {id} was not found.");
            return Ok(policy);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreatePolicy([FromBody] CreatePolicyDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var exists = await _policyRepo.PlanCodeExistsAsync(dto.PlanCode);
            if (exists)
                return Conflict($"A policy with PlanCode '{dto.PlanCode}' already exists.");

            var userOrgId = GetLoggedInUserOrgId();
            var created = await _policyRepo.CreatePolicyAsync(dto, userId.Value, userOrgId);
            return CreatedAtAction(nameof(GetPolicyById), new { id = created.PolicyID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdatePolicy(int id, [FromBody] UpdatePolicyDto dto)
        {
            var userId = GetLoggedInUserId();
            var userOrgId = GetLoggedInUserOrgId();

            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var existing = await _policyRepo.GetPolicyByIdAsync(id, userOrgId);
            if (existing == null)
                return NotFound($"Policy with ID {id} was not found.");

            if (existing.Status == "Expired")
                return BadRequest(
                    "This policy has expired and cannot be modified. " +
                    "Expired policies are permanent and locked.");

            var updated = await _policyRepo.UpdatePolicyAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Policy with ID {id} was not found.");

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeactivatePolicy(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify policy belongs to this org before deactivating ──         // ← SaaS FIX
            var policy = await _policyRepo.GetPolicyByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (policy == null)                                                    // ← SaaS FIX
                return NotFound($"Policy with ID {id} was not found.");           // ← SaaS FIX

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

        [HttpPost("check-expired")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> CheckExpiredPolicies()
        {
            var result = await _policyRepo.AutoExpirePoliciesAsync();
            return Ok(result);
        }
    }
}