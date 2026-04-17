using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        Task<List<Payment>> GetAllPaymentsAsync(
            string? status,
            int? claimId);

        Task<Payment?> GetPaymentByIdAsync(int id);

        Task<Payment> CreatePaymentAsync(Payment payment);

        Task<Payment?> AuthorizePaymentAsync(int id);

        Task<Payment?> ExecutePaymentAsync(
            int id,
            string referenceNumber);

        Task<Payment?> HoldPaymentAsync(int id);
        Task<Remittance?> GetRemittanceByPaymentIdAsync(
            int paymentId);

        Task<List<Reconciliation>> GetReconciliationsAsync();

        Task<Reconciliation> CreateReconciliationAsync(
            CreateReconciliationDto dto,
            int performedById);

        Task<Remittance?> AcknowledgeRemittanceAsync(
            int paymentId);
    }
}
