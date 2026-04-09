using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PolicyAndMemberController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PolicyAndMemberController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST /api/policyandmember/policy
        [HttpPost("policy")]
        public async Task<IActionResult> CreatePolicy([FromBody] PolicyDto dto)
        {
            if (!Enum.TryParse<PolicyStatus>(dto.Status, out var status))
                return BadRequest($"Invalid status: {dto.Status}. " +
                    "Valid options: Active, Expired, Suspended");

            // Check PlanCode uniqueness
            if (dto.PlanCode != null)
            {
                var codeExists = await _context.Policies
                    .AnyAsync(p => p.PlanCode == dto.PlanCode);
                if (codeExists)
                    return BadRequest($"PlanCode {dto.PlanCode} already exists.");
            }

            // Map DTO → Policy model
            var policy = new Policy
            {
                PlanCode = dto.PlanCode,
                PlanName = dto.PlanName,
                DeductibleAmount = dto.DeductibleAmount,
                OutOfPocketMax = dto.OutOfPocketMax,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                Status = status
            };

            _context.Policies.Add(policy);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPolicyById),
                new { id = policy.PolicyID }, policy);
        }

        // GET /api/policyandmember/policy/{id}
        [HttpGet("policy/{id}")]
        public async Task<IActionResult> GetPolicyById(int id)
        {
            var policy = await _context.Policies
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.PolicyID == id);

            if (policy == null)
                return NotFound($"Policy with ID {id} not found.");

            return Ok(policy);
        }

        // GET /api/policyandmember/policy
        [HttpGet("policy")]
        public async Task<IActionResult> GetAllPolicies()
        {
            var policies = await _context.Policies
                .Include(p => p.Members)
                .ToListAsync();
            return Ok(policies);
        }

        // POST /api/policyandmember/member
        [HttpPost("member")]
        public async Task<IActionResult> CreateMember([FromBody] MemberDto dto)
        {
            if (!Enum.TryParse<GenderType>(dto.Gender, out var gender))
                return BadRequest($"Invalid gender: {dto.Gender}. " +
                    "Valid options: Male, Female, Other");

            if (!Enum.TryParse<MemberStatus>(dto.Status, out var status))
                return BadRequest($"Invalid status: {dto.Status}. " +
                    "Valid options: Active, Inactive, Suspended");

            // Verify policy exists
            var policyExists = await _context.Policies
                .AnyAsync(p => p.PolicyID == dto.PolicyID);
            if (!policyExists)
                return BadRequest($"Policy with ID {dto.PolicyID} not found.");

            // Check MemberNumber uniqueness
            if (dto.MemberNumber != null)
            {
                var numExists = await _context.Members
                    .AnyAsync(m => m.MemberNumber == dto.MemberNumber);
                if (numExists)
                    return BadRequest($"MemberNumber {dto.MemberNumber} already exists.");
            }

            // Map DTO → Member model
            var member = new Member
            {
                PolicyID = dto.PolicyID,
                Name = dto.Name,
                DOB = dto.DOB,
                Gender = gender,
                MemberNumber = dto.MemberNumber,
                CoverageStart = dto.CoverageStart,
                CoverageEnd = dto.CoverageEnd,
                Status = status
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMemberById),
                new { id = member.MemberID }, member);
        }

        // GET /api/policyandmember/member/{id}
        [HttpGet("member/{id}")]
        public async Task<IActionResult> GetMemberById(int id)
        {
            var member = await _context.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == id);

            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            return Ok(member);
        }

        // GET /api/policyandmember/member
        [HttpGet("member")]
        public async Task<IActionResult> GetAllMembers()
        {
            var members = await _context.Members
                .Include(m => m.Policy)
                .ToListAsync();
            return Ok(members);
        }
    }
}