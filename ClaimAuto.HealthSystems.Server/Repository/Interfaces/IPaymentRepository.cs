using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IPaymentRepository
    {
        Task<List<Payment>> GetAllWithDetailsAsync();
        Task<Payment?> GetByIdWithDetailsAsync(int id);
        Task<Claim?> GetClaimAsync(int claimId);
        Task CreatePaymentWithAuditAsync(Payment payment, Remittance remittance, AuditLog log);
        Task UpdateAsync(Payment payment);
        Task LoadPayeeAsync(Payment payment);

        // Reconciliations
        Task<List<Reconciliation>> GetAllReconciliationsAsync();
        Task<Reconciliation> CreateReconciliationAsync(Reconciliation recon);

        Task SaveChangesAsync();
    }
}
