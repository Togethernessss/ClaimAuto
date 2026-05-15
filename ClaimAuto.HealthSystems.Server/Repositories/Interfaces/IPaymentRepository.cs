using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        Task<List<PaymentResponseDto>> GetAllPaymentsAsync(
            string? status,
            int? claimId);

        Task<PaymentResponseDto?> GetPaymentByIdAsync(int id);

        Task<PaymentResponseDto> CreatePaymentAsync(Payment payment);

        Task<PaymentResponseDto?> AuthorizePaymentAsync(int id);

        Task<PaymentResponseDto?> ExecutePaymentAsync(
            int id,
            string referenceNumber);

        Task<PaymentResponseDto?> HoldPaymentAsync(int id);

        Task<RemittanceResponseDto?> GetRemittanceByPaymentIdAsync(
            int paymentId);

        Task<List<ReconciliationResponseDto>> GetReconciliationsAsync();

        Task<ReconciliationResponseDto> CreateReconciliationAsync(
            CreateReconciliationDto dto,
            int performedById);

        Task<RemittanceResponseDto?> AcknowledgeRemittanceAsync(
            int paymentId);

        Task<PaymentResponseDto?> ResumePaymentAsync(int id);

        Task<List<RemittanceResponseDto>> GetAllRemittancesAsync(
            int? userId,
            string? userRole,
            string? status,
            string? search,
            int? claimId,
            DateTime? dateFrom,
            DateTime? dateTo);

        Task<byte[]?> GetRemittancePdfAsync(int paymentId);   // ← NEW
    }
}