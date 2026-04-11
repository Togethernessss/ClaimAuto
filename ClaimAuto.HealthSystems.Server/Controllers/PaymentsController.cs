using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
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
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff manage payments
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _service;

        public PaymentsController(IPaymentService service)
        {
            _service = service;
        }

        // GET: api/payments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetAllPayments()
        {
            var payments = await _service.GetAllAsync();
            return Ok(payments);
        }

        // GET: api/payments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentResponseDto>> GetPayment(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Payment);
        }

        // POST: api/payments
        [HttpPost]
        public async Task<ActionResult<PaymentResponseDto>> CreatePayment(CreatePaymentDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int currentUserId = int.Parse(userIdClaim!.Value);

            var result = await _service.CreateAsync(dto, currentUserId);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return CreatedAtAction(nameof(GetPayment), new { id = result.Payment!.PaymentID }, result.Payment);
        }

        // PUT: api/payments/5/authorize
        [HttpPut("{id}/authorize")]
        public async Task<IActionResult> AuthorizePayment(int id)
        {
            var result = await _service.AuthorizePaymentAsync(id);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return NoContent();
        }

        // GET: api/payments/reconciliations
        [HttpGet("reconciliations")]
        public async Task<ActionResult<IEnumerable<Reconciliation>>> GetReconciliations()
        {
            var records = await _service.GetAllReconciliationsAsync();
            return Ok(records);
        }

        // POST: api/payments/reconciliations
        [HttpPost("reconciliations")]
        public async Task<ActionResult<Reconciliation>> CreateReconciliation(Reconciliation recon)
        {
            var result = await _service.CreateReconciliationAsync(recon);
            return Ok(result);
        }
    }
}