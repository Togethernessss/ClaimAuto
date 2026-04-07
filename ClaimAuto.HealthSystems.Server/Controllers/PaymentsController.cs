using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/payments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payment>>> GetAllPayments()
        {
            var payments = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .ToListAsync();

            return Ok(payments);
        }

        // GET: api/payments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Payment>> GetPayment(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.PaymentID == id);

            if (payment == null)
                return NotFound();

            return Ok(payment);
        }

        // POST: api/payments
        // Creates a payment instruction for an approved claim
        [HttpPost]
        public async Task<ActionResult<Payment>> CreatePayment(Payment payment)
        {
            payment.CreatedAt = DateTime.UtcNow;
            payment.Status = PaymentStatus.Pending;

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // Auto-generate remittance advice
            var remittance = new Remittance
            {
                PaymentID = payment.PaymentID,
                GeneratedAt = DateTime.UtcNow,
                Status = RemittanceStatus.Generated
            };
            _context.Remittances.Add(remittance);

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = payment.PayeeID,
                Action = "CreatePayment",
                ResourceType = "Payment",
                ResourceID = payment.PaymentID.ToString(),
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentID }, payment);
        }

        // PUT: api/payments/5/authorize
        // Insurance Staff authorizes a pending payment
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
        public async Task<ActionResult<Reconciliation>> CreateReconciliation(
            Reconciliation recon)
        {
            recon.ReconciledAt = DateTime.UtcNow;
            _context.Reconciliations.Add(recon);
            await _context.SaveChangesAsync();
            return Ok(recon);
        }
    }
}
