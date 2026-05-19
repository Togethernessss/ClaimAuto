using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Controllers
{   /// <summary>Manages insurance policies. Admin and InsuranceStaff access.</summary>
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

        /// <summary>
        /// Returns active policies.
        /// Admin/Staff/Hospital: all active policies.
        /// Policyholder: only policies their members are enrolled under.
        /// </summary>
        [HttpGet("active")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital,Policyholder")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetActivePolicies()
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();

            // Policyholder only sees policies their own members are enrolled under
            if (userRole == "Policyholder" && userId.HasValue)
            {
                var policies = await _policyRepo.GetPoliciesForPolicyholderAsync(userId.Value);
                return Ok(policies);
            }

            // Admin, Staff, Hospital see all active policies
            // Admin, Staff, Hospital see all active policies — scoped to their org
            var userOrgId = GetLoggedInUserOrgId();
            var allActive = await _policyRepo.GetActivePoliciesAsync(userOrgId);
            return Ok(allActive);
        }


        /// <summary>Returns all policies regardless of status.</summary>
        /// <response code="200">Returns list of all policies.</response>
        [HttpGet]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllPolicies()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var policies = await _policyRepo.GetAllPoliciesAsync(userOrgId);
            return Ok(policies);
        }


        /// <summary>Returns a single policy by ID.</summary>
        /// <param name="id">The policy ID.</param>
        /// <response code="200">Returns the policy.</response>
        /// <response code="404">Policy not found.</response>
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

        /// <summary>Creates a new insurance policy. Admin only.</summary>
        /// <param name="dto">Policy details including plan code, coverage limits, and effective dates.</param>
        /// <response code="201">Policy created successfully.</response>
        /// <response code="401">Unauthorized — missing or invalid token.</response>
        /// <response code="409">A policy with the same PlanCode already exists.</response>
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

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping
            var created = await _policyRepo.CreatePolicyAsync(dto, userId.Value, userOrgId);
            return CreatedAtAction(nameof(GetPolicyById), new { id = created.PolicyID }, created);
        }


        /// <summary>Updates an existing policy. Admin only.</summary>
        /// <param name="id">The policy ID to update.</param>
        /// <param name="dto">Fields to update.</param>
        /// <response code="200">Policy updated successfully.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Policy not found.</response>
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

            // First check the policy exists (scoped to user's org)
            var existing = await _policyRepo.GetPolicyByIdAsync(id, userOrgId);
            if (existing == null)
                return NotFound($"Policy with ID {id} was not found.");

            // Block any update on Expired policies
            if (existing.Status == "Expired")
                return BadRequest(
                    "This policy has expired and cannot be modified. " +
                    "Expired policies are permanent and locked.");

            var updated = await _policyRepo.UpdatePolicyAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Policy with ID {id} was not found.");

            return Ok(updated);
        }


        /// <summary>Deactivates a policy. Fails if the policy has active members enrolled. Admin only.</summary>
        /// <param name="id">The policy ID to deactivate.</param>
        /// <response code="200">Policy deactivated successfully.</response>
        /// <response code="400">Policy already expired or has active members.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Policy not found.</response>
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


        /// <summary>
        /// Checks all Active policies whose EffectiveTo date has passed
        /// and marks them as Expired. Sends notification to Admin.
        /// Called automatically when Admin logs in.
        /// Admin only.
        /// </summary>
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