using ClaimAuto.HealthSystems.Server.Data;
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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff can adjudicate
    public class AdjudicationController : ControllerBase
    {
        private readonly IAdjudicationService _service;

        public AdjudicationController(IAdjudicationService service)
        {
            _service = service;
        }

        // GET: api/adjudication
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AdjudicationRecord>>> GetAllRecords()
        {
            var records = await _service.GetAllAsync();
            return Ok(records);
        }

        // GET: api/adjudication/claim/5
        [HttpGet("claim/{claimId}")]
        public async Task<ActionResult<IEnumerable<AdjudicationRecord>>> GetByClaimId(int claimId)
        {
            var records = await _service.GetByClaimIdAsync(claimId);
            return Ok(records);
        }

        // POST: api/adjudication/auto/5
        [HttpPost("auto/{claimId}")]
        public async Task<ActionResult<AdjudicationRecord>> AutoAdjudicate(int claimId)
        {
            var result = await _service.AutoAdjudicateAsync(claimId);
            if (!result.Success)
                return NotFound(result.Error);

            return CreatedAtAction(nameof(GetByClaimId), new { claimId }, result.Record);
        }

        // POST: api/adjudication/manual
        [HttpPost("manual")]
        public async Task<ActionResult<AdjudicationRecord>> ManualAdjudicate(
            [FromBody] AdjudicationRecord record)
        {
            var result = await _service.ManualAdjudicateAsync(record);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Record);
        }
    }
}