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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff manage payments
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/payments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetAllPayments()
        {
            var payments = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .ToListAsync();

            var response = payments.Select(p => new PaymentResponseDto
            {
                PaymentID = p.PaymentID,
                ClaimID = p.ClaimID,
                PayeeID = p.PayeeID,
                PayeeName = p.Payee?.Name ?? "",
                Amount = p.Amount,
                Currency = p.Currency,
                PaymentMethod = p.PaymentMethod.ToString(),
                Status = p.Status.ToString(),
                ReferenceNumber = p.ReferenceNumber,
                CreatedAt = p.CreatedAt,
                ScheduledAt = p.ScheduledAt,
                ExecutedAt = p.ExecutedAt
            });

            return Ok(response);
        }

        // GET: api/payments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentResponseDto>> GetPayment(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.PaymentID == id);

            if (payment == null)
                return NotFound();

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod.ToString(),
                Status = payment.Status.ToString(),
                ReferenceNumber = payment.ReferenceNumber,
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt
            };

            return Ok(response);
        }

        // POST: api/payments
        [HttpPost]
        public async Task<ActionResult<PaymentResponseDto>> CreatePayment(CreatePaymentDto dto)
        {
            // Get the logged-in user's ID from JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int currentUserId = int.Parse(userIdClaim!.Value);

            // Find the claim to get the ProviderID (payee)
            var claim = await _context.Claims.FindAsync(dto.ClaimID);
            if (claim == null)
                return NotFound($"Claim with ID {dto.ClaimID} not found.");

            if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
                return BadRequest($"Invalid PaymentMethod: {dto.PaymentMethod}");

            var payment = new Payment
            {
                ClaimID = dto.ClaimID,
                PayeeID = claim.ProviderID,
                Amount = dto.Amount,
                Currency = dto.Currency,
                PaymentMethod = paymentMethod,
                ReferenceNumber = dto.ReferenceNumber,
                CreatedAt = DateTime.UtcNow,
                Status = PaymentStatus.Pending
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                var remittance = new Remittance
                {
                    PaymentID = payment.PaymentID,
                    GeneratedAt = DateTime.UtcNow,
                    Status = RemittanceStatus.Generated
                };
                _context.Remittances.Add(remittance);

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = currentUserId,
                    Action = "CreatePayment",
                    ResourceType = "Payment",
                    ResourceID = payment.PaymentID.ToString(),
                    Timestamp = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            await _context.Entry(payment).Reference(p => p.Payee).LoadAsync();

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod.ToString(),
                Status = payment.Status.ToString(),
                ReferenceNumber = payment.ReferenceNumber,
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt
            };

            return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentID }, response);
        }

        // PUT: api/payments/5/authorize
        [HttpPut("{id}/authorize")]
        public async Task<IActionResult> AuthorizePayment(int id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
                return NotFound();

            if (payment.Status != PaymentStatus.Pending)
                return BadRequest($"Payment is already in {payment.Status} state.");

            payment.Status = PaymentStatus.Authorized;
            payment.ScheduledAt = DateTime.UtcNow.AddDays(1);

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET: api/payments/reconciliations
        [HttpGet("reconciliations")]
        public async Task<ActionResult<IEnumerable<Reconciliation>>> GetReconciliations()
        {
            var records = await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .ToListAsync();

            return Ok(records);
        }

        // POST: api/payments/reconciliations
        [HttpPost("reconciliations")]
        public async Task<ActionResult<Reconciliation>> CreateReconciliation(Reconciliation recon)
        {
            recon.ReconciledAt = DateTime.UtcNow;
            _context.Reconciliations.Add(recon);
            await _context.SaveChangesAsync();
            return Ok(recon);
        }
    }
}