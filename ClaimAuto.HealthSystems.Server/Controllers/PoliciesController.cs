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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff manage policies
    public class PoliciesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PoliciesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/policies
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PolicyResponseDto>>> GetAllPolicies()
        {
            var policies = await _context.Policies
                .Include(p => p.Members)
                .ToListAsync();

            var response = policies.Select(p => new PolicyResponseDto
            {
                PolicyID = p.PolicyID,
                PlanCode = p.PlanCode,
                PlanName = p.PlanName,
                CoverageRulesJSON = p.CoverageRulesJSON,
                DeductibleAmount = p.DeductibleAmount,
                OutOfPocketMax = p.OutOfPocketMax,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                Status = p.Status.ToString(),
                MemberCount = p.Members.Count
            });

            return Ok(response);
        }

        // GET: api/policies/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PolicyResponseDto>> GetPolicy(int id)
        {
            var policy = await _context.Policies
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.PolicyID == id);

            if (policy == null)
                return NotFound($"Policy with ID {id} not found.");

            var response = new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                DeductibleAmount = policy.DeductibleAmount,
                OutOfPocketMax = policy.OutOfPocketMax,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = policy.Members.Count
            };

            return Ok(response);
        }

        // GET: api/policies/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<PolicyResponseDto>>> GetActivePolicies()
        {
            var policies = await _context.Policies
                .Where(p => p.Status == PolicyStatus.Active)
                .Include(p => p.Members)
                .ToListAsync();

            var response = policies.Select(p => new PolicyResponseDto
            {
                PolicyID = p.PolicyID,
                PlanCode = p.PlanCode,
                PlanName = p.PlanName,
                CoverageRulesJSON = p.CoverageRulesJSON,
                DeductibleAmount = p.DeductibleAmount,
                OutOfPocketMax = p.OutOfPocketMax,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                Status = p.Status.ToString(),
                MemberCount = p.Members.Count
            });

            return Ok(response);
        }

        // POST: api/policies
        [HttpPost]
        public async Task<ActionResult<PolicyResponseDto>> CreatePolicy(CreatePolicyDto dto)
        {
            var policy = new Policy
            {
                PlanCode = dto.PlanCode,
                PlanName = dto.PlanName,
                CoverageRulesJSON = dto.CoverageRulesJSON,
                DeductibleAmount = dto.DeductibleAmount,
                OutOfPocketMax = dto.OutOfPocketMax,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                Status = PolicyStatus.Active
            };

            _context.Policies.Add(policy);
            await _context.SaveChangesAsync();

            var response = new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                DeductibleAmount = policy.DeductibleAmount,
                OutOfPocketMax = policy.OutOfPocketMax,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = 0
            };

            return CreatedAtAction(nameof(GetPolicy), new { id = policy.PolicyID }, response);
        }

        // PUT: api/policies/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePolicy(int id, UpdatePolicyDto dto)
        {
            var policy = await _context.Policies.FindAsync(id);
            if (policy == null)
                return NotFound();

            if (!Enum.TryParse<PolicyStatus>(dto.Status, true, out var status))
                return BadRequest($"Invalid Status: {dto.Status}. Valid: Active, Expired, Suspended");

            policy.PlanName = dto.PlanName;
            policy.CoverageRulesJSON = dto.CoverageRulesJSON;
            policy.DeductibleAmount = dto.DeductibleAmount;
            policy.OutOfPocketMax = dto.OutOfPocketMax;
            policy.EffectiveTo = dto.EffectiveTo;
            policy.Status = status;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/policies/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePolicy(int id)
        {
            var policy = await _context.Policies.FindAsync(id);
            if (policy == null)
                return NotFound();

            _context.Policies.Remove(policy);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}