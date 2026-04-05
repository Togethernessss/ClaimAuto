using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MembersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MembersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/members
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Member>>> GetAllMembers()
        {
            var members = await _context.Members
                .Include(m => m.Policy)
                .ToListAsync();
            return Ok(members);
        }

        // GET: api/members/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Member>> GetMember(int id)
        {
            var member = await _context.Members
                .Include(m => m.Policy)
                .Include(m => m.EligibilityChecks)
                .FirstOrDefaultAsync(m => m.MemberID == id);

            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            return Ok(member);
        }

        // GET: api/members/5/eligibility
        // Runs eligibility check and stores result
        [HttpGet("{id}/eligibility")]
        public async Task<ActionResult<EligibilityCheck>> CheckEligibility(int id)
        {
            var member = await _context.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == id);

            if (member == null)
                return NotFound($"Member with ID {id} not found.");

            // Check if a fresh cached result exists (within TTL)
            var cached = await _context.EligibilityChecks
                .Where(e => e.MemberID == id
                    && e.CheckedAt >= DateTime.UtcNow.AddSeconds(-(e.TTL ?? 0)))
                .OrderByDescending(e => e.CheckedAt)
                .FirstOrDefaultAsync();

            if (cached != null)
                return Ok(cached); // Return cached result

            // Create a new eligibility check result
            var check = new EligibilityCheck
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                CheckedAt = DateTime.UtcNow,
                Source = "API",
                TTL = 300, // Cache for 5 minutes
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
        public async Task<ActionResult<Member>> CreateMember(Member member)
        {
            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMember), new { id = member.MemberID }, member);
        }

        // PUT: api/members/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id, Member updatedMember)
        {
            if (id != updatedMember.MemberID)
                return BadRequest("ID mismatch.");

            var member = await _context.Members.FindAsync(id);
            if (member == null)
                return NotFound();

            member.Name = updatedMember.Name;
            member.ContactInfoJSON = updatedMember.ContactInfoJSON;
            member.CoverageEnd = updatedMember.CoverageEnd;
            member.Status = updatedMember.Status;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
