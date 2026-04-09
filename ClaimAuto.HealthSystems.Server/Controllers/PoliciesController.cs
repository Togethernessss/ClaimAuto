<<<<<<< HEAD
﻿using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore; 
=======
﻿using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
<<<<<<< HEAD
    [Route("api/[controller]")]
    [ApiController]
    public class PoliciesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PoliciesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/policies
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Policy>>> GetAllPolicies()
        {
            var policies = await _context.Policies.ToListAsync();
            return Ok(policies);
        }

        // GET: api/policies/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Policy>> GetPolicy(int id)
        {
            var policy = await _context.Policies
                .Include(p => p.Members)    // Show all members under this policy
                .FirstOrDefaultAsync(p => p.PolicyID == id);

            if (policy == null)
                return NotFound($"Policy with ID {id} not found.");

            return Ok(policy);
        }

        // GET: api/policies/active
        // Returns only active policies
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Policy>>> GetActivePolicies()
        {
            var policies = await _context.Policies
                .Where(p => p.Status == PolicyStatus.Active)
                .ToListAsync();

            return Ok(policies);
        }

        // POST: api/policies
        [HttpPost]
        public async Task<ActionResult<Policy>> CreatePolicy(Policy policy)
        {
            _context.Policies.Add(policy);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPolicy), new { id = policy.PolicyID }, policy);
        }

        // PUT: api/policies/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePolicy(int id, Policy updatedPolicy)
        {
            if (id != updatedPolicy.PolicyID)
                return BadRequest("ID mismatch.");

            var policy = await _context.Policies.FindAsync(id);
            if (policy == null)
                return NotFound();

            policy.PlanName = updatedPolicy.PlanName;
            policy.CoverageRulesJSON = updatedPolicy.CoverageRulesJSON;
            policy.DeductibleAmount = updatedPolicy.DeductibleAmount;
            policy.OutOfPocketMax = updatedPolicy.OutOfPocketMax;
            policy.EffectiveTo = updatedPolicy.EffectiveTo;
            policy.Status = updatedPolicy.Status;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/policies/5
        [HttpDelete("{id}")]
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
=======
    [ApiController]
    [Route("api/policies")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class PoliciesController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllPolicies() { }


        [HttpGet("active")]
        public async Task<IActionResult> GetActivePolicies() { }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetPolicyById(int id) { }


        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreatePolicy(
        [FromBody] CreatePolicyDto dto)
        { }


        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(int id,
        [FromBody] UpdatePolicyDto dto)
        { }



        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivatePolicy(int id) { }
    }
}
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
