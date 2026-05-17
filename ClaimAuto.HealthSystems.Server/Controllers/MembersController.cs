using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages policy members and eligibility checks. Admin and InsuranceStaff access.</summary>
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

        // ── GET /api/members ─────────────────────────────────────────────
        // Returns all members with optional filters
        // Example: /api/members?policyId=1&status=Active
        /// <summary>Returns all members with optional filters by policy and status.</summary>
        /// <param name="policyId">Filter by policy ID.</param>
        /// <param name="status">Filter by member status (e.g. Active, Inactive).</param>
        /// <response code="200">Returns list of members.</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllMembers(
        [FromQuery] int? policyId,
        [FromQuery] string? status)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();

            var members = await _memberRepo.GetAllMembersAsync(policyId, status);

            // Policyholder only sees members they own
            if (userRole == "Policyholder" && userId.HasValue)
            {
                var own = members
                    .Where(m => m.PolicyholderUserID == userId.Value)
                    .ToList();
                return Ok(own);
            }

            return Ok(members);
        }


        // ── GET /api/members/{id} ────────────────────────────────────────
        // Returns single member with PolicyName resolved
        /// <summary>Returns a single member by ID, including resolved PolicyName.</summary>
        /// <param name="id">The member ID.</param>
        /// <response code="200">Returns the member.</response>
        /// <response code="404">Member not found.</response>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]  // ← add this
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMemberById(int id)
        {
            var member = await _memberRepo.GetMemberByIdAsync(id);
            if (member == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(member);
        }


        // ── GET /api/members/{id}/eligibility ────────────────────────────
        // Checks eligibility with TTL-based caching (300 seconds)
        // Returns cached result if within TTL, otherwise runs fresh check
        /// <summary>Checks a member's eligibility. Results are cached for 300 seconds (TTL cache).</summary>
        /// <param name="id">The member ID to check eligibility for.</param>
        /// <response code="200">Returns eligibility result (cached or fresh).</response>
        /// <response code="404">Member not found.</response>
        [HttpGet("{id}/eligibility")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]  // ← add this
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CheckEligibility(int id)
        {
            var result = await _memberRepo.CheckEligibilityAsync(id);
            if (result == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(result);
        }


        // ── POST /api/members ────────────────────────────────────────────
        // Creates a new member under a policy
        // Validates: PolicyID must exist, MemberNumber must be unique
        /// <summary>Enrolls a new member under an active policy.</summary>
        /// <param name="dto">Member details including name, DOB, policy ID, and member number.</param>
        /// <response code="201">Member enrolled successfully.</response>
        /// <response code="400">Policy not found or not active.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="409">MemberNumber already exists.</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateMember([FromBody] CreateMemberDto dto)
        {
            // Step 1: Get logged-in user from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // Step 2: Check for duplicate MemberNumber
            if (!string.IsNullOrEmpty(dto.MemberNumber))
            {
                var exists = await _memberRepo.MemberNumberExistsAsync(dto.MemberNumber);
                if (exists)
                    return Conflict($"A member with MemberNumber '{dto.MemberNumber}' already exists.");
            }

            // Step 3: Create the member
            var created = await _memberRepo.CreateMemberAsync(dto, userId.Value);
            if (created == null)
                return BadRequest("Policy not found or is not active. Cannot enroll member under an inactive/expired policy.");

            // Step 4: Return 201 Created with location header
            return CreatedAtAction(nameof(GetMemberById), new { id = created.MemberID }, created);
        }

        // ── PUT /api/members/{id} ────────────────────────────────────────
        // Updates only mutable fields: Name, ContactInfoJSON, CoverageEnd, Status
        // DOB, Gender, PolicyID cannot be changed after creation
        /// <summary>Updates mutable member fields: Name, ContactInfo, CoverageEnd, Status.</summary>
        /// <param name="id">The member ID to update.</param>
        /// <param name="dto">Fields to update (DOB, Gender, and PolicyID cannot be changed).</param>
        /// <response code="200">Member updated successfully.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Member not found.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateMember(int id, [FromBody] UpdateMemberDto dto)
        {
            // Step 1: Get logged-in user from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // Step 2: Update the member
            var updated = await _memberRepo.UpdateMemberAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Member with ID {id} was not found.");

            return Ok(updated);
        }


        /// <summary>
        /// Auto-expires members whose CoverageEnd date has passed.
        /// Sets their status to Inactive.
        /// </summary>
        [HttpPost("check-expired")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> CheckExpiredMembers()
        {
            var result = await _memberRepo.AutoExpireMembersAsync();
            return Ok(result);
        }
    }
}