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
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class MembersController : ControllerBase
    {
        private readonly IMemberService _service;

        public MembersController(IMemberService service)
        {
            _service = service;
        }

        // GET: api/members
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MemberResponseDto>>> GetAllMembers()
        {
            var members = await _service.GetAllAsync();
            return Ok(members);
        }

        // GET: api/members/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MemberResponseDto>> GetMember(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Member);
        }

        // GET: api/members/5/eligibility
        [HttpGet("{id}/eligibility")]
        public async Task<ActionResult<EligibilityCheck>> CheckEligibility(int id)
        {
            var result = await _service.CheckEligibilityAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Check);
        }

        // POST: api/members
        [HttpPost]
        public async Task<ActionResult<MemberResponseDto>> CreateMember(CreateMemberDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(result.Error);

            return CreatedAtAction(nameof(GetMember), new { id = result.Member!.MemberID }, result.Member);
        }

        // PUT: api/members/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id, UpdateMemberDto dto)
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
    }
}