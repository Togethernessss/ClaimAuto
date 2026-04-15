using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IReportRepository
    {
        Task<List<Report>> GetAllReportsAsync(string? scope);

        Task<Report?> GetReportByIdAsync(int id);

        // Reads from Claims, Payments, AdjudicationRecords
        Task<Report> GenerateReportAsync(
            GenerateReportDto dto,
            int generatedById);

        Task<List<KPI>> GetAllKPIsAsync();

        Task<KPI?> UpdateKPIAsync(
            int id,
            UpdateKPIDto dto);

        Task<List<AuditPackage>> GetAllAuditPackagesAsync();

        Task<AuditPackage> GenerateAuditPackageAsync(
            DateTime periodStart,
            DateTime periodEnd,
            int generatedById);
    }
}
