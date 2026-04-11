using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IReportRepository
    {
        Task<List<Report>> GetAllAsync();
        Task<Report?> GetByIdWithUserAsync(int id);
        Task<List<Report>> GetByScopeAsync(ReportScope scope);
        Task<Report> CreateAsync(Report report);
        Task<Report?> GetByIdAsync(int id);
        Task DeleteReportAsync(Report report);

        // Dashboard
        Task<int> GetTotalClaimsAsync();
        Task<int> GetApprovedClaimsAsync();
        Task<int> GetRejectedClaimsAsync();
        Task<int> GetPendingClaimsAsync();
        Task<decimal> GetTotalPaidAsync();
        Task<int> GetOpenFraudCasesAsync();

        // KPIs
        Task<List<KPI>> GetAllKPIsAsync();
        Task<KPI?> GetKPIByIdAsync(int id);
        Task<KPI> CreateKPIAsync(KPI kpi);
        Task UpdateKPIAsync(KPI kpi);
        Task DeleteKPIAsync(KPI kpi);

        // Audit Packages
        Task<List<AuditPackage>> GetAllAuditPackagesAsync();
        Task<AuditPackage?> GetAuditPackageByIdAsync(int id);
        Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package);
        Task DeleteAuditPackageAsync(AuditPackage package);

        Task SaveChangesAsync();
    }
}
