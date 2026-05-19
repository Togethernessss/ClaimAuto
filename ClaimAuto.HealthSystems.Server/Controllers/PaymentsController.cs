using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
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

    /// <summary>
    /// Returns payments with optional filters.
    /// Admin and InsuranceStaff see all payments.
    /// Policyholder sees only payments tied to their own claims (auto-filtered).
    /// </summary>
    /// <param name="status">Filter by payment status.</param>
    /// <param name="claimId">Filter by claim ID.</param>
    /// <response code="200">Returns list of payments.</response>
    /// <response code="401">Unauthorized — invalid token.</response>
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

        if (userId == null)
            return Unauthorized("Invalid token.");

        var response = await _paymentRepository
            .GetAllPaymentsAsync(
                userId, userRole,
                status, claimId);

        return Ok(response);
    }

    /// <summary>Returns a single payment by ID.</summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentById(int id)
    {
        var response = await _paymentRepository
            .GetPaymentByIdAsync(id);

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
    public async Task<IActionResult> CreatePayment(
        [FromBody] CreatePaymentDto dto)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        if (dto.ClaimID <= 0)
            return BadRequest("Invalid ClaimID.");

        if (dto.Amount <= 0)
            return BadRequest("Amount must be greater than 0.");

        if (!Enum.TryParse<PaymentMethod>(
            dto.PaymentMethod, true, out var paymentMethod))
            return BadRequest(
                "Invalid payment method. Use: EFT, ACH, Check");

        var payment = new Payment
        {
            ClaimID = dto.ClaimID,
            PayeeID = dto.PayeeID,
            Amount = dto.Amount,
            Currency = dto.Currency,
            PaymentMethod = paymentMethod,
            ScheduledAt = dto.ScheduledAt
        };

        var response = await _paymentRepository
            .CreatePaymentAsync(payment, userId.Value);

        return CreatedAtAction(
            nameof(GetPaymentById),
            new { id = response.PaymentID },
            response);
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

        var response = await _paymentRepository
            .AuthorizePaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound(
                $"Payment {id} not found or not in Pending status.");

        return Ok(response);
    }

    /// <summary>Executes an Authorized payment.</summary>
    [HttpPut("{id}/execute")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExecutePayment(
        int id,
        [FromQuery] string referenceNumber)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

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

        if (!DateTime.TryParseExact(
                dateStr,
                "yyyyMMdd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var refDate))
            return BadRequest(
                "Invalid date in reference number. " +
                "Use format YYYYMMDD.");

        if (refDate.Date > DateTime.UtcNow.Date)
            return BadRequest(
                "Reference number date cannot be in the future.");

        if (refDate.Date < DateTime.UtcNow.Date.AddDays(-7))
            return BadRequest(
                "Reference number date is too old. " +
                "Bank transfers must be referenced within 7 days.");

        var response = await _paymentRepository
            .ExecutePaymentAsync(
                id,
                referenceNumber.Trim().ToUpper(),
                userId.Value);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or not in Authorized status.");

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

        var response = await _paymentRepository
            .HoldPaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or cannot be put on hold.");

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

        var response = await _paymentRepository
            .ResumePaymentAsync(id, userId.Value);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or not in OnHold status.");

        return Ok(response);
    }

    /// <summary>Returns the remittance for a payment.</summary>
    [HttpGet("{id}/remittance")]
    [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRemittance(int id)
    {
        var response = await _paymentRepository
            .GetRemittanceByPaymentIdAsync(id);

        if (response == null)
            return NotFound(
                $"Remittance for Payment {id} not found.");

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
            .GetAllRemittancesAsync(
                userId, userRole,
                status, search, claimId,
                dateFrom, dateTo);

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

        var pdfBytes = await _paymentRepository
            .GetRemittancePdfAsync(id);

        if (pdfBytes == null || pdfBytes.Length == 0)
            return NotFound(
                $"PDF not yet generated for Payment {id}.");

        return File(
            pdfBytes,
            "application/pdf",
            $"Remittance-PAY-{id}.pdf");
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

        var response = await _paymentRepository
            .AcknowledgeRemittanceAsync(id, userId.Value);

        if (response == null)
            return NotFound(
                $"Remittance for Payment {id} " +
                $"not found or not yet sent.");

        return Ok(response);
    }

    /// <summary>Returns all reconciliation records.</summary>
    [HttpGet("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReconciliations()
    {
        var response = await _paymentRepository
            .GetReconciliationsAsync();
        return Ok(response);
    }

    /// <summary>Creates a reconciliation report for a period.</summary>
    [HttpPost("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateReconciliation(
        [FromBody] CreateReconciliationDto dto)
    {
        var userId = GetLoggedInUserId();
        if (userId == null)
            return Unauthorized("Invalid token.");

        if (dto.PeriodStart >= dto.PeriodEnd)
            return BadRequest(
                "PeriodStart must be before PeriodEnd.");

        var response = await _paymentRepository
            .CreateReconciliationAsync(dto, userId.Value);

        return CreatedAtAction(
            nameof(GetReconciliations),
            new { id = response.ReconID },
            response);
    }
}