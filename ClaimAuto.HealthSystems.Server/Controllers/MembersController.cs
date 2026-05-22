using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages policy members and eligibility checks.</summary>
    [ApiController]
    [Route("api/members")]
    [Authorize]
    [Produces("application/json")]
    public class MembersController : BaseController
    {
        private readonly IMemberRepository _memberRepo;

        public MembersController(IMemberRepository memberRepo)
        {
            _memberRepo = memberRepo;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllMembers(
            [FromQuery] int? policyId,
            [FromQuery] string? status)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            var members = await _memberRepo.GetAllMembersAsync(policyId, status, userOrgId);

            if (userRole == "Policyholder" && userId.HasValue)
            {
                var own = members
                    .Where(m => m.PolicyholderUserID == userId.Value)
                    .ToList();
                return Ok(own);
            }

            return Ok(members);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMemberById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var member = await _memberRepo.GetMemberByIdAsync(id, userOrgId);
            if (member == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(member);
        }

        [HttpGet("{id}/eligibility")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CheckEligibility(int id)
        {
            // ── Verify member belongs to this org before checking eligibility ──  // ← SaaS FIX
            var member = await _memberRepo.GetMemberByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (member == null)                                                    // ← SaaS FIX
                return NotFound($"Member with ID {id} was not found.");           // ← SaaS FIX

            var result = await _memberRepo.CheckEligibilityAsync(id, GetLoggedInUserOrgId());
            if (result == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateMember([FromBody] CreateMemberDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // Validate that PolicyholderUserID is provided — every member must link to a registered user
            if (dto.PolicyholderUserID <= 0)
                return BadRequest("A registered Policyholder user must be selected to enroll a member.");

            var userOrgId = GetLoggedInUserOrgId();
            var created = await _memberRepo.CreateMemberAsync(dto, userId.Value, userOrgId);
            if (created == null)
                return BadRequest("Policy not found or is not active. Cannot enroll member under an inactive/expired policy.");

            return CreatedAtAction(nameof(GetMemberById), new { id = created.MemberID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateMember(int id, [FromBody] UpdateMemberDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ── Verify member belongs to this org before updating ──             // ← SaaS FIX
            var existing = await _memberRepo.GetMemberByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (existing == null)                                                  // ← SaaS FIX
                return NotFound($"Member with ID {id} was not found.");           // ← SaaS FIX

            var updated = await _memberRepo.UpdateMemberAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Member with ID {id} was not found.");

            return Ok(updated);
        }

        [HttpPost("check-expired")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> CheckExpiredMembers()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var result = await _memberRepo.AutoExpireMembersAsync(userOrgId);
            return Ok(result);
        }


        /// <summary>
        /// Returns the current Policyholder's own member record.
        /// Called by the Policyholder dashboard to show coverage card.
        /// </summary>
        [HttpGet("my")]
        [Authorize(Roles = "Policyholder")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMyMember()
        {
            var userId = GetLoggedInUserId();
            var userOrgId = GetLoggedInUserOrgId();

            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var member = await _memberRepo.GetMemberByPolicyholderUserIdAsync(userId.Value, userOrgId);

            if (member == null)
                return NotFound(
                    "No member record found for your account. " +
                    "Please contact your insurance provider to complete enrollment.");

            return Ok(member);
        }
    }
}