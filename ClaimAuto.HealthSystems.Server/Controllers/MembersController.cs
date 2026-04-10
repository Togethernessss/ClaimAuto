using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
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
        private readonly ApplicationDbContext _context;

        public MembersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/members
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MemberResponseDto>>> GetAllMembers()
        {
            var members = await _context.Members
                .Include(m => m.Policy)
                .ToListAsync();

            var response = members.Select(m => new MemberResponseDto
            {
                MemberID = m.MemberID,
                PolicyID = m.PolicyID,
                PolicyName = m.Policy?.PlanName ?? "",
                Name = m.Name,
                DOB = m.DOB,
                Gender = m.Gender.ToString(),
                MemberNumber = m.MemberNumber,
                ContactInfoJSON = m.ContactInfoJSON,
                CoverageStart = m.CoverageStart,
                CoverageEnd = m.CoverageEnd,
                Status = m.Status.ToString()
            });

            return Ok(response);
        }

        // GET: api/members/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MemberResponseDto>> GetMember(int id)
        {
            var member = await _context.Members
                .Include(m => m.Policy)
                .Include(m => m.EligibilityChecks)
                .FirstOrDefaultAsync(m => m.MemberID == id);

            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            var response = new MemberResponseDto
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                PolicyName = member.Policy?.PlanName ?? "",
                Name = member.Name,
                DOB = member.DOB,
                Gender = member.Gender.ToString(),
                MemberNumber = member.MemberNumber,
                ContactInfoJSON = member.ContactInfoJSON,
                CoverageStart = member.CoverageStart,
                CoverageEnd = member.CoverageEnd,
                Status = member.Status.ToString()
            };

            return Ok(response);
        }

        // GET: api/members/5/eligibility
        [HttpGet("{id}/eligibility")]
        public async Task<ActionResult<EligibilityCheck>> CheckEligibility(int id)
        {
            var member = await _context.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == id);

            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            var cached = await _context.EligibilityChecks
                .Where(e => e.MemberID == id
                    && e.CheckedAt >= DateTime.UtcNow.AddSeconds(-(e.TTL ?? 0)))
                .OrderByDescending(e => e.CheckedAt)
                .FirstOrDefaultAsync();

            if (cached != null)
                return Ok(cached);

            var check = new EligibilityCheck
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                CheckedAt = DateTime.UtcNow,
                Source = "API",
                TTL = 300,
                ResultJSON = System.Text.Json.JsonSerializer.Serialize(new
                {
                    IsEligible = member.Status == MemberStatus.Active,
                    PolicyStatus = member.Policy.Status.ToString(),
                    CoverageStart = member.CoverageStart,
                    CoverageEnd = member.CoverageEnd,
                    DeductibleAmount = member.Policy.DeductibleAmount,
                    OutOfPocketMax = member.Policy.OutOfPocketMax
                })
            };

            _context.EligibilityChecks.Add(check);
            await _context.SaveChangesAsync();

            return Ok(check);
        }

        // POST: api/members
        [HttpPost]
        public async Task<ActionResult<MemberResponseDto>> CreateMember(CreateMemberDto dto)
        {
            if (!Enum.TryParse<GenderType>(dto.Gender, true, out var gender))
                return BadRequest($"Invalid Gender: {dto.Gender}. Valid: Male, Female, Other");

            var member = new Member
            {
                PolicyID = dto.PolicyID,
                Name = dto.Name,
                DOB = dto.DOB,
                Gender = gender,
                MemberNumber = dto.MemberNumber,
                ContactInfoJSON = dto.ContactInfoJSON,
                CoverageStart = dto.CoverageStart,
                CoverageEnd = dto.CoverageEnd,
                Status = MemberStatus.Active
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            await _context.Entry(member).Reference(m => m.Policy).LoadAsync();

            var response = new MemberResponseDto
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                PolicyName = member.Policy?.PlanName ?? "",
                Name = member.Name,
                DOB = member.DOB,
                Gender = member.Gender.ToString(),
                MemberNumber = member.MemberNumber,
                ContactInfoJSON = member.ContactInfoJSON,
                CoverageStart = member.CoverageStart,
                CoverageEnd = member.CoverageEnd,
                Status = member.Status.ToString()
            };

            return CreatedAtAction(nameof(GetMember), new { id = member.MemberID }, response);
        }

        // PUT: api/members/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id, UpdateMemberDto dto)
        {
            var member = await _context.Members.FindAsync(id);
            if (member == null)
                return NotFound();

            if (!Enum.TryParse<MemberStatus>(dto.Status, true, out var status))
                return BadRequest($"Invalid Status: {dto.Status}. Valid: Active, Inactive, Suspended");

            member.Name = dto.Name;
            member.ContactInfoJSON = dto.ContactInfoJSON;
            member.CoverageEnd = dto.CoverageEnd;
            member.Status = status;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
