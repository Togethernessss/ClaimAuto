using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/members")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class MembersController : BaseController
    {
        private readonly IMemberRepository _memberRepo;

        public MembersController(IMemberRepository memberRepo)
        {
            _memberRepo = memberRepo;
        }

        
        [HttpGet]
        public async Task<IActionResult> GetAllMembers(
            [FromQuery] int? policyId,
            [FromQuery] string? status)
        {
            var members = await _memberRepo.GetAllMembersAsync(policyId, status);
            return Ok(members);
        }

        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMemberById(int id)
        {
            var member = await _memberRepo.GetMemberByIdAsync(id);
            if (member == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(member);
        }

        
        
        [HttpGet("{id}/eligibility")]
        public async Task<IActionResult> CheckEligibility(int id)
        {
            var result = await _memberRepo.CheckEligibilityAsync(id);
            if (result == null)
                return NotFound($"Member with ID {id} was not found.");
            return Ok(result);
        }

        
        [HttpPost]
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

        /
        [HttpPut("{id}")]
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
    }
}