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

    /// <summary>Returns all payments with optional filters. Admin and InsuranceStaff only.</summary>
    /// <param name="status">Filter by payment status.</param>
    /// <param name="claimId">Filter by claim ID.</param>
    /// <response code="200">Returns list of payments.</response>
    [HttpGet]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllPayments(
        [FromQuery] string? status,
        [FromQuery] int? claimId)
    {
        var response = await _paymentRepository
            .GetAllPaymentsAsync(status, claimId);

        return Ok(response);
    }

    /// <summary>Returns a single payment by ID. Admin and InsuranceStaff only.</summary>
    /// <param name="id">The payment ID.</param>
    /// <response code="200">Returns the payment.</response>
    /// <response code="404">Payment not found.</response>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentById(int id)
    {
        var response = await _paymentRepository
            .GetPaymentByIdAsync(id);

        if (response == null)
            return NotFound(
                $"Payment {id} not found.");

        return Ok(response);
    }

    /// <summary>Creates a new payment in Pending status for a claim.</summary>
    /// <param name="dto">Payment details including ClaimID, amount, method (EFT/ACH/Check), and schedule.</param>
    /// <response code="201">Payment created successfully in Pending status.</response>
    /// <response code="400">Invalid ClaimID, amount, or payment method.</response>
    /// <response code="401">Unauthorized.</response>
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

        var response = await _paymentRepository
            .CreatePaymentAsync(payment);

        return CreatedAtAction(
            nameof(GetPaymentById),
            new { id = response.PaymentID },
            response);
    }

    /// <summary>Authorizes a Pending payment, moving it to Authorized status.</summary>
    /// <param name="id">The payment ID to authorize.</param>
    /// <response code="200">Payment authorized successfully.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Payment not found or not in Pending status.</response>
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
            .AuthorizePaymentAsync(id);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or not in Pending status.");

        return Ok(response);
    }

    /// <summary>Executes an Authorized payment, moving it to Executed status.</summary>
    /// <param name="id">The payment ID to execute.</param>
    /// <param name="referenceNumber">The bank/transfer reference number for the executed payment.</param>
    /// <response code="200">Payment executed successfully.</response>
    /// <response code="400">Reference number is missing.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Payment not found or not in Authorized status.</response>
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

        if (string.IsNullOrEmpty(referenceNumber))
            return BadRequest(
                "Reference number is required.");

        var response = await _paymentRepository
            .ExecutePaymentAsync(id, referenceNumber);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or not in Authorized status.");

        return Ok(response);
    }

    /// <summary>Places a payment on hold, preventing further processing.</summary>
    /// <param name="id">The payment ID to hold.</param>
    /// <response code="200">Payment placed on hold.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Payment not found or cannot be put on hold.</response>
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
            .HoldPaymentAsync(id);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or cannot be put on hold.");

        return Ok(response);
    }

    /// <summary>Resumes an OnHold payment, moving it back to Pending status.</summary>
    /// <param name="id">The payment ID to resume.</param>
    /// <response code="200">Payment resumed successfully.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Payment not found or not in OnHold status.</response>
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
            .ResumePaymentAsync(id);

        if (response == null)
            return NotFound(
                $"Payment {id} not found " +
                $"or not in OnHold status.");

        return Ok(response);
    }

    /// <summary>Returns the remittance advice for a payment. Admin, InsuranceStaff, and Hospital roles.</summary>
    /// <param name="id">The payment ID.</param>
    /// <response code="200">Returns the remittance advice.</response>
    /// <response code="404">Remittance not found for this payment.</response>
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
                $"Remittance for Payment {id} " +
                $"not found.");

        return Ok(response);
    }

    /// <summary>
    /// Returns all remittances with optional filters.
    /// Admin and Staff see all. Hospital sees only their own.
    /// </summary>
    /// <param name="status">Filter by remittance status.</param>
    /// <param name="search">Search by payee name or remittance ID.</param>
    /// <param name="claimId">Filter by claim ID.</param>
    /// <param name="dateFrom">Filter by generated date from.</param>
    /// <param name="dateTo">Filter by generated date to.</param>
    /// <response code="200">Returns list of remittances.</response>
    /// <response code="401">Unauthorized.</response>
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

    /// <summary>Downloads the PDF remittance advice for a payment.</summary>
    /// <param name="id">The payment ID.</param>
    /// <response code="200">Returns PDF file.</response>
    /// <response code="404">PDF not found for this remittance.</response>
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

    /// <summary>Acknowledges receipt of a remittance advice. Hospital role only.</summary>
    /// <param name="id">The payment ID whose remittance to acknowledge.</param>
    /// <response code="200">Remittance acknowledged successfully.</response>
    /// <response code="401">Unauthorized.</response>
    /// <response code="404">Remittance not found or not yet sent.</response>
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
            .AcknowledgeRemittanceAsync(id);

        if (response == null)
            return NotFound(
                $"Remittance for Payment {id} " +
                $"not found or not yet sent.");

        return Ok(response);
    }

    /// <summary>Returns all payment reconciliation records. Admin and InsuranceStaff only.</summary>
    /// <response code="200">Returns list of reconciliation records.</response>
    [HttpGet("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReconciliations()
    {
        var response = await _paymentRepository
            .GetReconciliationsAsync();

        return Ok(response);
    }

    /// <summary>Generates a payment reconciliation report for a given period.</summary>
    /// <param name="dto">Period start and end dates for reconciliation.</param>
    /// <response code="201">Reconciliation record created successfully.</response>
    /// <response code="400">PeriodStart must be before PeriodEnd.</response>
    /// <response code="401">Unauthorized.</response>
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
            .CreateReconciliationAsync(
                dto, userId.Value);

        return CreatedAtAction(
            nameof(GetReconciliations),
            new { id = response.ReconID },
            response);
    }
}