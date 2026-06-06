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

        // Returns null if a non-Failed payment already exists for this claim
        // (duplicate-payment guard). Controller maps null → 409 Conflict.
        Task<PaymentResponseDto?> CreatePaymentAsync(
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

        // ── SaaS FIX: tenant-scoped remittance list ──
        Task<List<RemittanceResponseDto>> GetAllRemittancesAsync(
            int? userId,
            string? userRole,
            string? status,
            string? search,
            int? claimId,
            DateTime? dateFrom,
            DateTime? dateTo,
            int? userOrgId = null);

        Task<RemittanceResponseDto?> AcknowledgeRemittanceAsync(
            int paymentId,
            int acknowledgedByUserId);

        // ── SaaS FIX: tenant-scoped reconciliation list ──
        Task<List<ReconciliationResponseDto>> GetReconciliationsAsync(int? userOrgId = null);

        // ── SaaS FIX: tenant stamp on reconciliation creation ──
        Task<ReconciliationResponseDto> CreateReconciliationAsync(
            CreateReconciliationDto dto,
            int performedById,
            int? userOrgId = null);

        Task<byte[]?> GetRemittancePdfAsync(int paymentId);

        // ── SaaS FIX: tenant-scoped reconciliation PDF lookup ──
        Task<byte[]?> GetReconciliationPdfAsync(int reconId, int? userOrgId = null);
    }
}