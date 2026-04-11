using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/rules")]
    [Authorize(Roles = "Admin")]   // Admin only — manages business rules
    public class RulesController : BaseController
    {
        // GET /api/rules
        // Returns all rules. Filter by Status, RuleType.
        [HttpGet]
        public async Task<IActionResult> GetAllRules(
            [FromQuery] string? status,
            [FromQuery] string? ruleType)
        {
            throw new NotImplementedException(); 
        }

        // GET /api/rules/{id}
        // Returns single rule with full details.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRuleById(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/rules
        // Creates a new rule. Starts as Draft.
        // Version = 1. CreatedBy from JWT token.
        // Uses ACID transaction.
        [HttpPost]
        public async Task<IActionResult> CreateRule(
            [FromBody] CreateRuleDto dto)
        {
            throw new NotImplementedException(); 
        }

        // PUT /api/rules/{id}
        // Updates a rule. Auto-increments Version.
        // Old version preserved in database for audit.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRule(int id,
            [FromBody] UpdateRuleDto dto)
        {
            throw new NotImplementedException();
        }

        // PUT /api/rules/{id}/activate
        // Changes Status from Draft/Inactive to Active.
        // Rule starts being used in adjudication immediately.
        [HttpPut("{id}/activate")]
        public async Task<IActionResult> ActivateRule(int id) 
        {
            throw new NotImplementedException();
        }

        // PUT /api/rules/{id}/deactivate
        // Changes Status to Inactive.
        // Rule stops being used in adjudication immediately.
        [HttpPut("{id}/deactivate")]
        public async Task<IActionResult> DeactivateRule(int id) 
        {
            throw new NotImplementedException();
        }

        // DELETE /api/rules/{id}
        // Only allowed for Draft rules that have never been activated.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRule(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
