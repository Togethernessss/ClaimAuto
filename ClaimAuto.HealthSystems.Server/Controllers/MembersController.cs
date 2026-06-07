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

        /// <summary>Returns members for the org. Hospital sees only patients they have prior claims for; Policyholder sees only their own enrollments.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllMembers(
            [FromQuery] int? policyId,
            [FromQuery] string? status)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            // Hospital: only their own patients (members with prior claims from this provider)
            if (userRole == "Hospital" && userId.HasValue)
            {
                var patients = await _memberRepo.GetAllMembersAsync(policyId, status, userOrgId, providerUserId: userId.Value);
                return Ok(patients);
            }

            var members = await _memberRepo.GetAllMembersAsync(policyId, status, userOrgId);

            // Policyholder: only their own enrollment(s)
            if (userRole == "Policyholder" && userId.HasValue)
            {
                return Ok(members.Where(m => m.PolicyholderUserID == userId.Value).ToList());
            }

            return Ok(members);
        }

        /// <summary>Returns a single member by ID. Admin, Staff, and Hospital only.</summary>
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

        /// <summary>Runs an eligibility check for a member against their active policy rules and coverage limits.</summary>
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

        /// <summary>Enrolls a new member under a policy. Returns 409 if the policyholder is already enrolled in the same policy.</summary>
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

            // 1.2 — Block duplicate enrollment (same policyholder + same policy in same org).
            // Backend check is authoritative; frontend modal also warns the user.
            var alreadyEnrolled = await _memberRepo.IsEnrolledInPolicyAsync(
                dto.PolicyholderUserID, dto.PolicyID, userOrgId);
            if (alreadyEnrolled)
            {
                return Conflict(new
                {
                    message = "This policyholder is already enrolled in the selected policy. " +
                              "Pick a different policy or update the existing enrollment."
                });
            }

            var created = await _memberRepo.CreateMemberAsync(dto, userId.Value, userOrgId);
            if (created == null)
                return BadRequest("Failed to enroll member. Ensure the policy is active and Coverage Start is not a past date.");

            return CreatedAtAction(nameof(GetMemberById), new { id = created.MemberID }, created);
        }

        /// <summary>Updates a member's coverage dates or status. Admin and Staff only.</summary>
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

        /// <summary>Scans all members and expires any whose coverage end date has passed. Admin and Staff only.</summary>
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
        /// Looks up a member by member number.
        /// Used by Hospital during claim submission — avoids the circular dependency
        /// where hospitals can only see patients they've already submitted claims for.
        /// </summary>
        [HttpGet("lookup")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> LookupMemberByNumber([FromQuery] string memberNumber)
        {
            if (string.IsNullOrWhiteSpace(memberNumber))
                return BadRequest("memberNumber query parameter is required.");

            var userOrgId = GetLoggedInUserOrgId();
            var member = await _memberRepo.GetMemberByNumberAsync(memberNumber.Trim(), userOrgId);

            if (member == null)
                return NotFound($"No member found with member number '{memberNumber}'.");

            return Ok(member);
        }

        /// <summary>
        /// Looks up every enrollment that shares a member number.
        /// Used when one policyholder has multiple active policies under the same Member ID.
        /// </summary>
        [HttpGet("lookup-all")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> LookupMemberEnrollmentsByNumber([FromQuery] string memberNumber)
        {
            if (string.IsNullOrWhiteSpace(memberNumber))
                return BadRequest("memberNumber query parameter is required.");

            var userOrgId = GetLoggedInUserOrgId();
            var members = await _memberRepo.GetMembersByNumberAsync(memberNumber.Trim(), userOrgId);

            if (!members.Any())
                return NotFound($"No member found with member number '{memberNumber}'.");

            return Ok(members);
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
