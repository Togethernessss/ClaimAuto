using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IReportPdfService
    {
        byte[] GenerateReportPdf(Report report);
    }
}

