using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Implementations;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

/// <summary>Manages claim payments through state machine: Pending → Authorized → Executed.</summary>
[ApiController]
[Route("api/payments")]
[Authorize]
[Produces("application/json")]
public class PaymentsController : BaseController
{
    private readonly IPaymentRepository _paymentRepository;

    public PaymentsController(
        IPaymentRepository paymentRepository)
    {
        _paymentRepository = paymentRepository;
    }

    /// <summary>Returns payments with optional filters.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,InsuranceStaff,Policyholder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAllPayments(
        [FromQuery] string? status,
        [FromQuery] int? claimId)
    {
        var userId = GetLoggedInUserId();
        var userRole = GetLoggedInUserRole();
        var userOrgId = GetLoggedInUserOrgId();

        if (userId == null)
            return Unauthorized("Invalid token.");

        var response = await _paymentRepository
            .GetAllPaymentsAsync(userId, userRole, status, claimId, userOrgId);

        return Ok(response);
    }

    /// <summary>Returns a single payment by ID.</summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentById(int id)
    {
        var userOrgId = GetLoggedInUserOrgId();
        var response = await _paymentRepository
            .GetPaymentByIdAsync(id, userOrgId);

        if (response == null)
            return NotFound($"Payment {id} not found.");

        return Ok(response);
    }

    /// <summary>Creates a new payment in Pending status.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        var userOrgId = GetLoggedInUserOrgId();

        if (dto.ClaimID <= 0)
            return BadRequest("Invalid ClaimID.");

        if (dto.Amount <= 0)
            return BadRequest("Amount must be greater than 0.");

        if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            return BadRequest("Invalid payment method. Use: EFT, ACH, Check");

        var payment = new Payment
        {
            ClaimID = dto.ClaimID,
            PayeeID = dto.PayeeID,
            Amount = dto.Amount,
            Currency = dto.Currency,
            PaymentMethod = paymentMethod,
            ScheduledAt = dto.ScheduledAt,
            OrganizationID = userOrgId,
        };

        var response = await _paymentRepository.CreatePaymentAsync(payment, userId.Value);

        // 4.1 — null means an active payment already exists for this claim.
        if (response == null)
        {
            return Conflict(new
            {
                message = "A payment already exists for this claim. " +
                          "Cancel or void the existing payment before creating a new one."
            });
        }

        return CreatedAtAction(nameof(GetPaymentById),
            new { id = response.PaymentID }, response);
    }

    /// <summary>Authorizes a Pending payment.</summary>
    [HttpPut("{id}/authorize")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AuthorizePayment(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var existing = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (existing == null)                                                      // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var response = await _paymentRepository.AuthorizePaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound($"Payment {id} not found or not in Pending status.");

        return Ok(response);
    }

    /// <summary>Executes an Authorized payment.</summary>
    [HttpPut("{id}/execute")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExecutePayment(int id, [FromQuery] string referenceNumber)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var existing = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (existing == null)                                                      // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        if (string.IsNullOrWhiteSpace(referenceNumber))
            return BadRequest("Reference number is required.");

        var refRegex = new System.Text.RegularExpressions
            .Regex(@"^[A-Z]+\/\d{8}\/[A-Z0-9]+$");

        if (!refRegex.IsMatch(referenceNumber.Trim().ToUpper()))
            return BadRequest(
                "Invalid reference number format. " +
                "Use: PREFIX/YYYYMMDD/IDENTIFIER. " +
                "Examples: NEFT/20260518/HDFC000123, " +
                "RTGS/20260518/ICICI000456, " +
                "IMPS/20260518/428512345678, " +
                "UPI/20260518/TXN8823671234");

        var parts = referenceNumber.Trim().ToUpper().Split('/');
        var dateStr = parts[1];

        if (!DateTime.TryParseExact(dateStr, "yyyyMMdd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var refDate))
            return BadRequest("Invalid date in reference number. Use format YYYYMMDD.");

        if (refDate.Date > DateTime.UtcNow.Date)
            return BadRequest("Reference number date cannot be in the future.");

        if (refDate.Date < DateTime.UtcNow.Date.AddDays(-7))
            return BadRequest("Reference number date is too old. Bank transfers must be referenced within 7 days.");

        var response = await _paymentRepository
            .ExecutePaymentAsync(id, referenceNumber.Trim().ToUpper(), userId.Value);

        if (response == null)
            return NotFound($"Payment {id} not found or not in Authorized status.");

        return Ok(response);
    }

    /// <summary>Places a payment on hold.</summary>
    [HttpPut("{id}/hold")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HoldPayment(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var existing = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (existing == null)                                                      // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var response = await _paymentRepository.HoldPaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound($"Payment {id} not found or cannot be put on hold.");

        return Ok(response);
    }

    /// <summary>Resumes an OnHold payment back to Pending.</summary>
    [HttpPut("{id}/resume")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResumePayment(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var existing = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (existing == null)                                                      // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var response = await _paymentRepository.ResumePaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound($"Payment {id} not found or not in OnHold status.");

        return Ok(response);
    }

    /// <summary>Returns the remittance for a payment.</summary>
    [HttpGet("{id}/remittance")]
    [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRemittance(int id)
    {
        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var payment = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (payment == null)                                                       // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var response = await _paymentRepository.GetRemittanceByPaymentIdAsync(id);

        if (response == null)
            return NotFound($"Remittance for Payment {id} not found.");

        return Ok(response);
    }

    /// <summary>Returns all remittances. Hospital sees only their own.</summary>
    [HttpGet("remittances")]
    [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAllRemittances(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int? claimId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var userId = GetLoggedInUserId();
        var userRole = GetLoggedInUserRole();

        if (userId == null)
            return Unauthorized("Invalid token.");

        var response = await _paymentRepository
    .GetAllRemittancesAsync(userId, userRole, status, search, claimId, dateFrom, dateTo, GetLoggedInUserOrgId());

        return Ok(response);
    }

    /// <summary>Downloads the PDF receipt for a payment.</summary>
    [HttpGet("{id}/remittance/pdf")]
    [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRemittancePdf(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var payment = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (payment == null)                                                       // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var pdfBytes = await _paymentRepository.GetRemittancePdfAsync(id);

        if (pdfBytes == null || pdfBytes.Length == 0)
            return NotFound($"PDF not yet generated for Payment {id}.");

        return File(pdfBytes, "application/pdf", $"Remittance-PAY-{id}.pdf");
    }

    /// <summary>Acknowledges receipt of a remittance. Hospital only.</summary>
    [HttpPut("{id}/remittance/acknowledge")]
    [Authorize(Roles = "Hospital")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcknowledgeRemittance(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        // ── Verify payment belongs to this org ──                                // ← SaaS FIX
        var payment = await _paymentRepository.GetPaymentByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
        if (payment == null)                                                       // ← SaaS FIX
            return NotFound($"Payment {id} not found.");                          // ← SaaS FIX

        var response = await _paymentRepository.AcknowledgeRemittanceAsync(id, userId.Value);

        if (response == null)
            return NotFound($"Remittance for Payment {id} not found or not yet sent.");

        return Ok(response);
    }

    /// <summary>Returns all reconciliation records.</summary>
    [HttpGet("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReconciliations()
    {
        var response = await _paymentRepository.GetReconciliationsAsync(GetLoggedInUserOrgId());
        return Ok(response);
    }

    /// <summary>Creates a reconciliation report for a period.</summary>
    [HttpPost("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateReconciliation([FromBody] CreateReconciliationDto dto)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        if (dto.PeriodStart >= dto.PeriodEnd)
            return BadRequest("PeriodStart must be before PeriodEnd.");

        var response = await _paymentRepository.CreateReconciliationAsync(dto, userId.Value, GetLoggedInUserOrgId());

        return CreatedAtAction(nameof(GetReconciliations),
            new { id = response.ReconID }, response);
    }

    /// <summary>Downloads the PDF for a reconciliation report.</summary>
    [HttpGet("reconciliation/{id}/pdf")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReconciliationPdf(int id)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        var pdfBytes = await _paymentRepository.GetReconciliationPdfAsync(id, GetLoggedInUserOrgId());

        if (pdfBytes == null || pdfBytes.Length == 0)
            return NotFound($"Reconciliation {id} not found.");

        return File(pdfBytes, "application/pdf", $"Reconciliation-REC-{id}.pdf");
    }
}