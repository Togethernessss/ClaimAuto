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

        /// <summary>Returns active policies. Policyholders see only their own enrolled policies; all others see the full org list.</summary>
        [HttpGet("active")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital,Policyholder")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetActivePolicies()
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();

            if (userRole == "Policyholder")
            {
                if (!userId.HasValue)
                    return Unauthorized("Invalid token — user ID claim missing.");

                var policies = await _policyRepo.GetPoliciesForPolicyholderAsync(
                    userId.Value,
                    GetLoggedInUserOrgId(),
                    activeOnly: true);
                return Ok(policies);
            }

            var userOrgId = GetLoggedInUserOrgId();
            var allActive = await _policyRepo.GetActivePoliciesAsync(userOrgId);
            return Ok(allActive);
        }

        /// <summary>Returns all policies. Policyholders see only their own enrollments; Admin and Staff see all org policies.</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,InsuranceStaff,Policyholder")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllPolicies()
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            if (userRole == "Policyholder")
            {
                if (!userId.HasValue)
                    return Unauthorized("Invalid token — user ID claim missing.");

                var ownPolicies = await _policyRepo.GetPoliciesForPolicyholderAsync(
                    userId.Value,
                    userOrgId);
                return Ok(ownPolicies);
            }

            var policies = await _policyRepo.GetAllPoliciesAsync(userOrgId);
            return Ok(policies);
        }

        /// <summary>Returns a single policy by ID. Admin, Staff, and Hospital only.</summary>
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

        /// <summary>Creates a new policy. Returns 409 if the PlanCode already exists. Admin only.</summary>
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

        /// <summary>Updates an existing policy. Expired policies cannot be modified. Admin only.</summary>
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

        /// <summary>Deactivates a policy. Fails with 400 if the policy has active members enrolled. Admin only.</summary>
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

        /// <summary>Scans all policies and marks any past their EffectiveTo date as Expired. Admin only.</summary>
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
