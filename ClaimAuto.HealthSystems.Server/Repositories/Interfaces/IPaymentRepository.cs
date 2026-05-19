using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        Task<List<PaymentResponseDto>> GetAllPaymentsAsync(
            int? userId,
            string? userRole,
            string? status,
            int? claimId,
            int? userOrgId = null);
        Task<PaymentResponseDto?> GetPaymentByIdAsync(int id, int? userOrgId = null);

        Task<PaymentResponseDto> CreatePaymentAsync(
            Payment payment,
            int createdByUserId);

        Task<PaymentResponseDto?> AuthorizePaymentAsync(
            int id,
            int authorizedByUserId);

        Task<PaymentResponseDto?> ExecutePaymentAsync(
            int id,
            string referenceNumber,
            int executedByUserId);

        Task<PaymentResponseDto?> HoldPaymentAsync(
            int id,
            int heldByUserId);

        Task<PaymentResponseDto?> ResumePaymentAsync(
            int id,
            int resumedByUserId);

        Task<RemittanceResponseDto?> GetRemittanceByPaymentIdAsync(
            int paymentId);

        Task<List<RemittanceResponseDto>> GetAllRemittancesAsync(
            int? userId,
            string? userRole,
            string? status,
            string? search,
            int? claimId,
            DateTime? dateFrom,
            DateTime? dateTo);

        Task<RemittanceResponseDto?> AcknowledgeRemittanceAsync(
            int paymentId,
            int acknowledgedByUserId);

        Task<List<ReconciliationResponseDto>> GetReconciliationsAsync();

        Task<ReconciliationResponseDto> CreateReconciliationAsync(
            CreateReconciliationDto dto,
            int performedById);

        Task<byte[]?> GetRemittancePdfAsync(int paymentId);

        Task<byte[]?> GetReconciliationPdfAsync(int reconId);
    }
}