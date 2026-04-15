using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/payments")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class PaymentsController : BaseController
    {
        private readonly IPaymentRepository
            _paymentRepository;

        public PaymentsController(
            IPaymentRepository paymentRepository)
        {
            _paymentRepository = paymentRepository;
        }

        // GET /api/payments
        [HttpGet]
        public async Task<IActionResult> GetAllPayments(
            [FromQuery] string? status,
            [FromQuery] int? claimId)
        {
            var payments = await _paymentRepository
                .GetAllPaymentsAsync(status, claimId);

            var response = payments.Select(p =>
                new PaymentResponseDto
                {
                    PaymentID = p.PaymentID,
                    ClaimID = p.ClaimID,
                    PayeeID = p.PayeeID,
                    PayeeName = p.Payee?.Name ?? "Unknown",
                    Amount = p.Amount,
                    Currency = p.Currency,
                    PaymentMethod = p.PaymentMethod
                        .ToString(),
                    Status = p.Status.ToString(),
                    CreatedAt = p.CreatedAt,
                    ScheduledAt = p.ScheduledAt,
                    ExecutedAt = p.ExecutedAt,
                    ReferenceNumber = p.ReferenceNumber
                }).ToList();

            return Ok(response);
        }

        // GET /api/payments/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPaymentById(
            int id)
        {
            var payment = await _paymentRepository
                .GetPaymentByIdAsync(id);

            if (payment == null)
                return NotFound(
                    $"Payment {id} not found.");

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name
                    ?? "Unknown",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod
                    .ToString(),
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt,
                ReferenceNumber = payment.ReferenceNumber
            };

            return Ok(response);
        }

        // POST /api/payments
        // Creates payment + auto generates Remittance
        [HttpPost]
        public async Task<IActionResult> CreatePayment(
            [FromBody] CreatePaymentDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (dto.ClaimID <= 0)
                return BadRequest("Invalid ClaimID.");

            if (dto.Amount <= 0)
                return BadRequest(
                    "Amount must be greater than 0.");

            if (!Enum.TryParse<PaymentMethod>(
                dto.PaymentMethod, true,
                out var paymentMethod))
                return BadRequest(
                    "Invalid payment method. " +
                    "Use: EFT, ACH, Check");

            var payment = new Payment
            {
                ClaimID = dto.ClaimID,
                PayeeID = dto.PayeeID,
                Amount = dto.Amount,
                Currency = dto.Currency,
                PaymentMethod = paymentMethod,
                ScheduledAt = dto.ScheduledAt
            };

            var created = await _paymentRepository
                .CreatePaymentAsync(payment);

            var response = new PaymentResponseDto
            {
                PaymentID = created.PaymentID,
                ClaimID = created.ClaimID,
                PayeeID = created.PayeeID,
                PayeeName = created.Payee?.Name
                    ?? "Unknown",
                Amount = created.Amount,
                Currency = created.Currency,
                PaymentMethod = created.PaymentMethod
                    .ToString(),
                Status = created.Status.ToString(),
                CreatedAt = created.CreatedAt,
                ScheduledAt = created.ScheduledAt,
                ExecutedAt = created.ExecutedAt,
                ReferenceNumber = created.ReferenceNumber
            };

            return CreatedAtAction(
                nameof(GetPaymentById),
                new { id = created.PaymentID },
                response);
        }

        // PUT /api/payments/{id}/authorize
        // Pending → Authorized
        [HttpPut("{id}/authorize")]
        public async Task<IActionResult> AuthorizePayment(
            int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var payment = await _paymentRepository
                .AuthorizePaymentAsync(id);

            if (payment == null)
                return NotFound(
                    $"Payment {id} not found " +
                    $"or not in Pending status.");

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name
                    ?? "Unknown",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod
                    .ToString(),
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt,
                ReferenceNumber = payment.ReferenceNumber
            };

            return Ok(response);
        }

        // PUT /api/payments/{id}/execute
        // Authorized → Executed
        // Claim → Paid
        // Remittance → Sent
        [HttpPut("{id}/execute")]
        public async Task<IActionResult> ExecutePayment(
            int id,
            [FromQuery] string referenceNumber)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (string.IsNullOrEmpty(referenceNumber))
                return BadRequest(
                    "Reference number is required.");

            var payment = await _paymentRepository
                .ExecutePaymentAsync(id, referenceNumber);

            if (payment == null)
                return NotFound(
                    $"Payment {id} not found " +
                    $"or not in Authorized status.");

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name
                    ?? "Unknown",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod
                    .ToString(),
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt,
                ReferenceNumber = payment.ReferenceNumber
            };

            return Ok(response);
        }

        // PUT /api/payments/{id}/hold
        // Pending/Authorized → OnHold
        [HttpPut("{id}/hold")]
        public async Task<IActionResult> HoldPayment(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var payment = await _paymentRepository
                .HoldPaymentAsync(id);

            if (payment == null)
                return NotFound(
                    $"Payment {id} not found " +
                    $"or cannot be put on hold.");

            var response = new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name
                    ?? "Unknown",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentMethod = payment.PaymentMethod
                    .ToString(),
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt,
                ScheduledAt = payment.ScheduledAt,
                ExecutedAt = payment.ExecutedAt,
                ReferenceNumber = payment.ReferenceNumber
            };

            return Ok(response);
        }

        // GET /api/payments/{id}/remittance
        // Hospital + Staff + Admin can view
        [HttpGet("{id}/remittance")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        public async Task<IActionResult> GetRemittance(
            int id)
        {
            var remittance = await _paymentRepository
                .GetRemittanceByPaymentIdAsync(id);

            if (remittance == null)
                return NotFound(
                    $"Remittance for Payment {id} " +
                    $"not found.");

            var response = new RemittanceResponseDto
            {
                RemittanceID = remittance.RemittanceID,
                PaymentID = remittance.PaymentID,
                RemitFileURI = remittance.RemitFileURI,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt =
                    remittance.SentToProviderAt,
                Status = remittance.Status.ToString()
            };

            return Ok(response);
        }


        // PUT /api/payments/{id}/remittance/acknowledge
        // Hospital only — Rahul acknowledges
        // Sent → Acknowledged
        [HttpPut("{id}/remittance/acknowledge")]
        [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
        public async Task<IActionResult>
            AcknowledgeRemittance(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Manual role check — only Hospital
            var role = GetLoggedInUserRole();
            if (role != "Hospital")
                return Forbid();

            var remittance = await _paymentRepository
                .AcknowledgeRemittanceAsync(id);

            if (remittance == null)
                return NotFound(
                    $"Remittance for Payment {id} " +
                    $"not found or not yet sent.");

            var response = new RemittanceResponseDto
            {
                RemittanceID = remittance.RemittanceID,
                PaymentID = remittance.PaymentID,
                RemitFileURI = remittance.RemitFileURI,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt = remittance.SentToProviderAt,
                Status = remittance.Status.ToString()
            };

            return Ok(response);
        }

        // GET /api/payments/reconciliation
        [HttpGet("reconciliation")]
        public async Task<IActionResult>
            GetReconciliations()
        {
            var reconciliations = await _paymentRepository
                .GetReconciliationsAsync();

            var response = reconciliations.Select(r =>
                new ReconciliationResponseDto
                {
                    ReconID = r.ReconID,
                    PeriodStart = r.PeriodStart,
                    PeriodEnd = r.PeriodEnd,
                    PaymentsSummaryJSON =
                        r.PaymentsSummaryJSON,
                    DiscrepanciesJSON = r.DiscrepanciesJSON,
                    ReconciledAt = r.ReconciledAt,
                    PerformedByName = r.PerformedBy?.Name
                        ?? "Unknown"
                }).ToList();

            return Ok(response);
        }

        // POST /api/payments/reconciliation
        [HttpPost("reconciliation")]
        public async Task<IActionResult>
            CreateReconciliation(
                [FromBody] CreateReconciliationDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (dto.PeriodStart >= dto.PeriodEnd)
                return BadRequest(
                    "PeriodStart must be before PeriodEnd.");

            var reconciliation = await _paymentRepository
                .CreateReconciliationAsync(
                    dto, userId.Value);

            var response = new ReconciliationResponseDto
            {
                ReconID = reconciliation.ReconID,
                PeriodStart = reconciliation.PeriodStart,
                PeriodEnd = reconciliation.PeriodEnd,
                PaymentsSummaryJSON =
                    reconciliation.PaymentsSummaryJSON,
                DiscrepanciesJSON =
                    reconciliation.DiscrepanciesJSON,
                ReconciledAt = reconciliation.ReconciledAt,
                PerformedByName =
                    reconciliation.PerformedBy?.Name
                    ?? "Unknown"
            };

            return CreatedAtAction(
                nameof(GetReconciliations),
                new { id = reconciliation.ReconID },
                response);
        }
    }
}
