using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClaimController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClaimController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST /api/claim
        [HttpPost]
        public async Task<IActionResult> SubmitClaim([FromBody] ClaimDto dto)
        {
            if (!Enum.TryParse<ClaimType>(dto.ClaimType, out var claimType))
                return BadRequest($"Invalid ClaimType: {dto.ClaimType}. " +
                    "Valid options: Inpatient, Outpatient, Pharmacy");

            if (!Enum.TryParse<ClaimPriority>(dto.Priority, out var priority))
                return BadRequest($"Invalid Priority: {dto.Priority}. " +
                    "Valid options: Normal, High, Urgent");

            if (!Enum.TryParse<SourceChannel>(dto.SourceChannel, out var channel))
                return BadRequest($"Invalid SourceChannel: {dto.SourceChannel}. " +
                    "Valid options: Portal, EDI, API, BatchCSV");

            // Verify Provider is a Hospital user
            var provider = await _context.Users
                .FirstOrDefaultAsync(u => u.UserID == dto.ProviderID
                                       && u.Role == UserRole.Hospital);
            if (provider == null)
                return BadRequest($"Provider ID {dto.ProviderID} not found " +
                    "or is not a Hospital.");

            // Verify Member exists
            var member = await _context.Members
                .FirstOrDefaultAsync(m => m.MemberID == dto.MemberID);
            if (member == null)
                return BadRequest($"Member with ID {dto.MemberID} not found.");

            // Verify Policy exists and is Active
            var policy = await _context.Policies
                .FirstOrDefaultAsync(p => p.PolicyID == dto.PolicyID);
            if (policy == null)
                return BadRequest($"Policy with ID {dto.PolicyID} not found.");
            if (policy.Status != PolicyStatus.Active)
                return BadRequest("Policy is not Active.");

            // Map DTO → Claim model
            var claim = new Claim
            {
                ExternalClaimRef = dto.ExternalClaimRef,
                ProviderID = dto.ProviderID,
                MemberID = dto.MemberID,
                PolicyID = dto.PolicyID,
                ClaimType = claimType,
                TotalBilledAmount = dto.TotalBilledAmount,
                Currency = dto.Currency,
                Priority = priority,
                SourceChannel = channel,
                SubmittedAt = DateTime.UtcNow,  // auto-set
                ReceivedAt = DateTime.UtcNow,  // auto-set
                Status = ClaimStatus.Submitted // always starts here
            };

            _context.Claims.Add(claim);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClaimById),
                new { id = claim.ClaimID }, claim);
        }

        // POST /api/claim/{id}/lines
        [HttpPost("{id}/lines")]
        public async Task<IActionResult> AddClaimLine(int id,
            [FromBody] ClaimLineDto dto)
        {
            var claimExists = await _context.Claims
                .AnyAsync(c => c.ClaimID == id);
            if (!claimExists)
                return NotFound($"Claim with ID {id} not found.");

            // Map DTO → ClaimLine model
            var line = new ClaimLine
            {
                ClaimID = id,  // from URL
                ServiceCode = dto.ServiceCode,
                ServiceDate = dto.ServiceDate,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                LineBilledAmount = dto.LineBilledAmount,
                DiagnosisCodesJSON = dto.DiagnosisCodesJSON,
                ProcedureCodesJSON = dto.ProcedureCodesJSON,
                LineStatus = LineStatus.Pending  // always starts Pending
            };

            _context.ClaimLines.Add(line);
            await _context.SaveChangesAsync();

            return Ok(line);
        }

        // GET /api/claim/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var claim = await _context.Claims
                .Include(c => c.Provider)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .FirstOrDefaultAsync(c => c.ClaimID == id);

            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            return Ok(claim);
        }

        // GET /api/claim
        [HttpGet]
        public async Task<IActionResult> GetAllClaims()
        {
            var claims = await _context.Claims
                .Select(c => new
                {
                    c.ClaimID,
                    c.ExternalClaimRef,
                    c.TotalBilledAmount,
                    c.Currency,
                    c.Status,
                    c.Priority,
                    c.ClaimType,
                    c.SourceChannel,
                    c.SubmittedAt,
                    ProviderName = c.Provider.Name,
                    MemberName = c.Member.Name,
                    PolicyName = c.Policy.PlanName,
                    LineCount = c.ClaimLines.Count
                })
                .ToListAsync();

            return Ok(claims);
        }

        // PATCH /api/claim/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateClaimStatus(int id,
            [FromBody] string newStatus)
        {
            if (!Enum.TryParse<ClaimStatus>(newStatus, out var status))
                return BadRequest($"Invalid status: {newStatus}. " +
                    "Valid options: Submitted, Validated, Adjudicated, Rejected, Paid");

            var claim = await _context.Claims.FindAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            claim.Status = status;
            await _context.SaveChangesAsync();

            return Ok(claim);
        }
    }
}