using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        // GET /api/payments
        // Returns all payments
        // Filter by status and claimId if provided
        Task<List<Payment>> GetAllPaymentsAsync(
            string? status,
            int? claimId);

        // GET /api/payments/{id}
        // Returns single payment with Claim + Payee + Remittance
        // Returns null if not found
        Task<Payment?> GetPaymentByIdAsync(int id);

        // POST /api/payments
        // Creates payment instruction
        // Auto generates Remittance in same ACID transaction
        // Validates: Claim must be Adjudicated
        //            Decision must be Paid or Partial
        Task<Payment> CreatePaymentAsync(Payment payment);

        // PUT /api/payments/{id}/authorize
        // Status: Pending → Authorized
        // Returns null if not found
        Task<Payment?> AuthorizePaymentAsync(int id);

        // PUT /api/payments/{id}/execute
        // Status: Authorized → Executed
        // Stamps ExecutedAt + ReferenceNumber
        // Updates Claim.Status → Paid
        Task<Payment?> ExecutePaymentAsync(
            int id,
            string referenceNumber);

        // PUT /api/payments/{id}/hold
        // Status: Pending/Authorized → OnHold
        // Returns null if not found
        Task<Payment?> HoldPaymentAsync(int id);

        // GET /api/payments/{id}/remittance
        // Returns remittance for a specific payment
        // Returns null if not found
        Task<Remittance?> GetRemittanceByPaymentIdAsync(
            int paymentId);

        // GET /api/payments/reconciliation
        // Returns all reconciliation records
        // Newest first
        Task<List<Reconciliation>> GetReconciliationsAsync();

        // POST /api/payments/reconciliation
        // Creates new reconciliation record
        // performedById comes from JWT token
        Task<Reconciliation> CreateReconciliationAsync(
            CreateReconciliationDto dto,
            int performedById);

        // NEW — Rahul acknowledges remittance
        Task<Remittance?> AcknowledgeRemittanceAsync(
            int paymentId);
    }
}
