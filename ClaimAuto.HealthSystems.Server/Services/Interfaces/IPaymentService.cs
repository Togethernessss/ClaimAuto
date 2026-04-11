using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IPaymentService
    {
        Task<List<PaymentResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, PaymentResponseDto? Payment)> GetByIdAsync(int id);
        Task<(bool Success, string Error, PaymentResponseDto? Payment)> CreateAsync(CreatePaymentDto dto, int currentUserId);
        Task<(bool Success, string Error)> AuthorizePaymentAsync(int id);

        // Reconciliations
        Task<List<Reconciliation>> GetAllReconciliationsAsync();
        Task<Reconciliation> CreateReconciliationAsync(Reconciliation recon);
    }
}