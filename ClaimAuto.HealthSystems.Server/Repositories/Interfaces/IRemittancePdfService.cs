using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IRemittancePdfService
    {
        byte[] GenerateRemittancePdf(
            Remittance remittance,
            Payment payment);
    }
}