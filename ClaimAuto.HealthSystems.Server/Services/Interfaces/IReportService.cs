using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IReportService
    {
        Task<List<Report>> GetAllAsync();
        Task<(bool Success, string Error, Report? Report)> GetByIdAsync(int id);
        Task<List<Report>> GetByScopeAsync(ReportScope scope);
        Task<Report> CreateAsync(Report report);
        Task<(bool Success, string Error)> DeleteReportAsync(int id);

        // Dashboard
        Task<object> GetDashboardAsync();

        // KPIs
        Task<List<KPI>> GetAllKPIsAsync();
        Task<(bool Success, string Error, KPI? Kpi)> GetKPIByIdAsync(int id);
        Task<KPI> CreateKPIAsync(KPI kpi);
        Task<(bool Success, string Error)> UpdateKPIAsync(int id, KPI updated);
        Task<(bool Success, string Error)> DeleteKPIAsync(int id);

        // Audit Packages
        Task<List<AuditPackage>> GetAllAuditPackagesAsync();
        Task<(bool Success, string Error, AuditPackage? Package)> GetAuditPackageByIdAsync(int id);
        Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package);
        Task<(bool Success, string Error)> DeleteAuditPackageAsync(int id);

    }
}
