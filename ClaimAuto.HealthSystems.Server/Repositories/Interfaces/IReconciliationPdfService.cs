using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IReconciliationPdfService
    {
        byte[] GenerateReconciliationPdf(
            Reconciliation reconciliation,
            List<Payment> payments);
    }
}