using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _repo;

        public PaymentService(IPaymentRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<PaymentResponseDto>> GetAllAsync()
        {
            var payments = await _repo.GetAllWithDetailsAsync();
            return payments.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, PaymentResponseDto? Payment)> GetByIdAsync(int id)
        {
            var payment = await _repo.GetByIdWithDetailsAsync(id);
            if (payment == null)
                return (false, $"Payment with ID {id} not found.", null);

            return (true, "", MapToDto(payment));
        }

        public async Task<(bool Success, string Error, PaymentResponseDto? Payment)> CreateAsync(CreatePaymentDto dto, int currentUserId)
        {
            var claim = await _repo.GetClaimAsync(dto.ClaimID);
            if (claim == null)
                return (false, $"Claim with ID {dto.ClaimID} not found.", null);

            if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
                return (false, $"Invalid PaymentMethod: {dto.PaymentMethod}", null);

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

            var remittance = new Remittance
            {
                GeneratedAt = DateTime.UtcNow,
                Status = RemittanceStatus.Generated
            };

            var log = new AuditLog
            {
                UserID = currentUserId,
                Action = "CreatePayment",
                ResourceType = "Payment",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreatePaymentWithAuditAsync(payment, remittance, log);
            await _repo.LoadPayeeAsync(payment);

            return (true, "", MapToDto(payment));
        }

        public async Task<(bool Success, string Error)> AuthorizePaymentAsync(int id)
        {
            var payment = await _repo.GetByIdWithDetailsAsync(id);
            if (payment == null)
                return (false, $"Payment with ID {id} not found.");

            if (payment.Status != PaymentStatus.Pending)
                return (false, $"Payment is already in {payment.Status} state.");

            payment.Status = PaymentStatus.Authorized;
            payment.ScheduledAt = DateTime.UtcNow.AddDays(1);

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<List<Reconciliation>> GetAllReconciliationsAsync()
        {
            return await _repo.GetAllReconciliationsAsync();
        }

        public async Task<Reconciliation> CreateReconciliationAsync(Reconciliation recon)
        {
            return await _repo.CreateReconciliationAsync(recon);
        }

        private static PaymentResponseDto MapToDto(Payment p)
        {
            return new PaymentResponseDto
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
            };
        }
    }
}

