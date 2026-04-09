using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/members")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class MembersController : ControllerBase
    {
        // GET /api/members
        // Returns all members. Filter by PolicyID, Status.
        [HttpGet]
        public async Task<IActionResult> GetAllMembers(
            [FromQuery] int? policyId,
            [FromQuery] string? status)
        {
            throw new NotImplementedException();
        }

        // GET /api/members/{id}
        // Returns single member with PolicyName resolved.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMemberById(int id) 
        {
            throw new NotImplementedException();
        }

        // GET /api/members/{id}/eligibility
        // Checks eligibility with TTL-based caching.
        // If a valid cached result exists (TTL not expired) — returns cached.
        // Otherwise — runs a new real-time check and caches it.
        // Returns: EligibilityResponseDto
        [HttpGet("{id}/eligibility")]
        public async Task<IActionResult> CheckEligibility(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/members
        // Creates a new member. PolicyID, DOB, Gender set once.
        [HttpPost]
        public async Task<IActionResult> CreateMember(
            [FromBody] CreateMemberDto dto)
        {
            throw new NotImplementedException(); 
        }

        // PUT /api/members/{id}
        // Updates only mutable fields — Name, Contact, CoverageEnd, Status.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id,
            [FromBody] UpdateMemberDto dto)
        {
            throw new NotImplementedException(); 
        }
    }
}
