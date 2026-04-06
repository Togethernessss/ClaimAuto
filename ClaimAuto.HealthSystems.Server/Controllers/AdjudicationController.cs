using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdjudicationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdjudicationController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST /api/adjudication
        [HttpPost]
        public async Task<IActionResult> CreateAdjudication(
            [FromBody] AdjudicationDto dto)
        {
            if (!Enum.TryParse<AdjDecision>(dto.Decision, out var decision))
                return BadRequest($"Invalid Decision: {dto.Decision}. " +
                    "Valid options: Paid, Denied, Partial, PendingReview");

            // Verify claim exists
            var claim = await _context.Claims.FindAsync(dto.ClaimID);
            if (claim == null)
                return NotFound($"Claim with ID {dto.ClaimID} not found.");

            // If manual adjudication, verify staff member exists
            if (dto.PerformedByID.HasValue)
            {
                var staffExists = await _context.Users
                    .AnyAsync(u => u.UserID == dto.PerformedByID.Value
                                && u.Role == UserRole.InsuranceStaff);
                if (!staffExists)
                    return BadRequest("PerformedBy user not found " +
                        "or is not InsuranceStaff.");
            }

            // Map DTO → AdjudicationRecord model
            var record = new AdjudicationRecord
            {
                ClaimID = dto.ClaimID,
                EngineVersion = dto.EngineVersion,
                Decision = decision,
                CalculationsJSON = dto.CalculationsJSON,
                AppliedRulesJSON = dto.AppliedRulesJSON,
                Notes = dto.Notes,
                PerformedByID = dto.PerformedByID,
                ExecutedAt = DateTime.UtcNow  // auto-set
            };

            _context.AdjudicationRecords.Add(record);

            // Update claim status to Adjudicated
            claim.Status = ClaimStatus.Adjudicated;

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAdjudicationByClaimId),
                new { claimId = record.ClaimID }, record);
        }

        // GET /api/adjudication/{claimId}
        [HttpGet("{claimId}")]
        public async Task<IActionResult> GetAdjudicationByClaimId(int claimId)
        {
            var record = await _context.AdjudicationRecords
                .Include(a => a.Claim)
                .Include(a => a.PerformedBy)
                .FirstOrDefaultAsync(a => a.ClaimID == claimId);

            if (record == null)
                return NotFound($"No adjudication found for Claim ID {claimId}.");

            return Ok(record);
        }

        // POST /api/adjudication/payment
        [HttpPost("payment")]
        public async Task<IActionResult> CreatePayment([FromBody] PaymentDto dto)
        {
            if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, out var method))
                return BadRequest($"Invalid PaymentMethod: {dto.PaymentMethod}. " +
                    "Valid options: EFT, ACH, Check");

            // Verify claim is adjudicated
            var claim = await _context.Claims.FindAsync(dto.ClaimID);
            if (claim == null)
                return NotFound($"Claim with ID {dto.ClaimID} not found.");
            if (claim.Status != ClaimStatus.Adjudicated)
                return BadRequest("Claim must be Adjudicated before payment.");

            // Verify adjudication was not Denied
            var adj = await _context.AdjudicationRecords
                .FirstOrDefaultAsync(a => a.ClaimID == dto.ClaimID);
            if (adj == null)
                return BadRequest("No adjudication record found for this claim.");
            if (adj.Decision == AdjDecision.Denied)
                return BadRequest("Cannot create payment for a Denied claim.");

            // Verify payee is a Hospital
            var payeeExists = await _context.Users
                .AnyAsync(u => u.UserID == dto.PayeeID
                            && u.Role == UserRole.Hospital);
            if (!payeeExists)
                return BadRequest($"Payee ID {dto.PayeeID} not found " +
                    "or is not a Hospital.");

            // Map DTO → Payment model
            var payment = new Payment
            {
                ClaimID = dto.ClaimID,
                PayeeID = dto.PayeeID,
                Amount = dto.Amount,
                Currency = dto.Currency,
                PaymentMethod = method,
                ScheduledAt = dto.ScheduledAt,
                CreatedAt = DateTime.UtcNow,      // auto-set
                Status = PaymentStatus.Pending  // always starts Pending
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPaymentByClaimId),
                new { claimId = payment.ClaimID }, payment);
        }

        // GET /api/adjudication/payment/{claimId}
        [HttpGet("payment/{claimId}")]
        public async Task<IActionResult> GetPaymentByClaimId(int claimId)
        {
            var payment = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.ClaimID == claimId);

            if (payment == null)
                return NotFound($"No payment found for Claim ID {claimId}.");

            return Ok(payment);
        }

        // PATCH /api/adjudication/payment/{id}/execute
        [HttpPatch("payment/{id}/execute")]
        public async Task<IActionResult> ExecutePayment(int id,
            [FromBody] ExecutePaymentDto dto)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
                return NotFound($"Payment with ID {id} not found.");
            if (payment.Status != PaymentStatus.Authorized)
                return BadRequest("Payment must be Authorized before Execution. " +
                    "Update status to Authorized first.");

            payment.Status = PaymentStatus.Executed;
            payment.ExecutedAt = DateTime.UtcNow;
            payment.ReferenceNumber = dto.ReferenceNumber;

            // Update claim to Paid
            var claim = await _context.Claims.FindAsync(payment.ClaimID);
            if (claim != null)
                claim.Status = ClaimStatus.Paid;

            await _context.SaveChangesAsync();

            return Ok(payment);
        }

        // PATCH /api/adjudication/payment/{id}/authorize
        // Added this so you can authorize a payment before executing it
        [HttpPatch("payment/{id}/authorize")]
        public async Task<IActionResult> AuthorizePayment(int id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
                return NotFound($"Payment with ID {id} not found.");
            if (payment.Status != PaymentStatus.Pending)
                return BadRequest("Only Pending payments can be Authorized.");

            payment.Status = PaymentStatus.Authorized;
            await _context.SaveChangesAsync();

            return Ok(payment);
        }

        // POST /api/adjudication/remittance
        [HttpPost("remittance")]
        public async Task<IActionResult> CreateRemittance(
            [FromBody] RemittanceDto dto)
        {
            // Verify payment exists
            var payment = await _context.Payments.FindAsync(dto.PaymentID);
            if (payment == null)
                return NotFound($"Payment with ID {dto.PaymentID} not found.");

            // 1-to-1 check — only one remittance per payment
            var alreadyExists = await _context.Remittances
                .AnyAsync(r => r.PaymentID == dto.PaymentID);
            if (alreadyExists)
                return BadRequest("Remittance already exists for this payment.");

            // Map DTO → Remittance model
            var remittance = new Remittance
            {
                PaymentID = dto.PaymentID,
                RemitFileURI = dto.RemitFileURI,
                GeneratedAt = DateTime.UtcNow,              // auto-set
                Status = RemittanceStatus.Generated     // always starts here
            };

            _context.Remittances.Add(remittance);
            await _context.SaveChangesAsync();

            return Ok(remittance);
        }

        // GET /api/adjudication/remittance/{paymentId}
        [HttpGet("remittance/{paymentId}")]
        public async Task<IActionResult> GetRemittanceByPaymentId(int paymentId)
        {
            var remittance = await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(r => r.PaymentID == paymentId);

            if (remittance == null)
                return NotFound($"No remittance for Payment ID {paymentId}.");

            return Ok(remittance);
        }
    }
}