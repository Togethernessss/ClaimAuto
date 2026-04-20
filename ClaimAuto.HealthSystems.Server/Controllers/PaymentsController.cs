using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : BaseController
{
    private readonly IPaymentRepository _paymentRepository;

    public PaymentsController(
        IPaymentRepository paymentRepository)
    {
        _paymentRepository = paymentRepository;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public async Task<IActionResult> GetAllPayments(
        [FromQuery] string? status,
        [FromQuery] int? claimId)
    {
        var response = await _paymentRepository
            .GetAllPaymentsAsync(status, claimId);

        return Ok(response);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public async Task<IActionResult> GetPaymentById(int id)
    {
        var response = await _paymentRepository
            .GetPaymentByIdAsync(id);

        if (response == null)
            return NotFound(
                $"Payment {id} not found.");

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,InsuranceStaff")]
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

    [HttpPut("{id}/authorize")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public async Task<IActionResult> AuthorizePayment(
        int id)
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

    [HttpPut("{id}/execute")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
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

    [HttpPut("{id}/hold")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
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

    [HttpGet("{id}/remittance")]
    [Authorize(Roles = "Admin,InsuranceStaff,Hospital")]
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

    [HttpPut("{id}/remittance/acknowledge")]
    [Authorize(Roles = "Hospital")]
    public async Task<IActionResult>
        AcknowledgeRemittance(int id)
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

    [HttpGet("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public async Task<IActionResult>
        GetReconciliations()
    {
        var response = await _paymentRepository
            .GetReconciliationsAsync();

        return Ok(response);
    }

    [HttpPost("reconciliation")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
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

        var response = await _paymentRepository
            .CreateReconciliationAsync(
                dto, userId.Value);

        return CreatedAtAction(
            nameof(GetReconciliations),
            new { id = response.ReconID },
            response);
    }
}