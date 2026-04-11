using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _repo;

        public ReportService(IReportRepository repo)
        {
            _repo = repo;
        }

        // ── Reports ─────────────────────────────────────

        public async Task<List<Report>> GetAllAsync()
        {
            return await _repo.GetAllAsync();
        }

        public async Task<(bool Success, string Error, Report? Report)> GetByIdAsync(int id)
        {
            var report = await _repo.GetByIdWithUserAsync(id);
            if (report == null)
                return (false, $"Report with ID {id} not found.", null);

            return (true, "", report);
        }

        public async Task<List<Report>> GetByScopeAsync(ReportScope scope)
        {
            return await _repo.GetByScopeAsync(scope);
        }

        public async Task<Report> CreateAsync(Report report)
        {
            return await _repo.CreateAsync(report);
        }

        public async Task<(bool Success, string Error)> DeleteReportAsync(int id)
        {
            var report = await _repo.GetByIdAsync(id);
            if (report == null)
                return (false, $"Report with ID {id} not found.");

            await _repo.DeleteReportAsync(report);
            return (true, "");
        }

        // ── Dashboard ───────────────────────────────────

        public async Task<object> GetDashboardAsync()
        {
            var totalClaims = await _repo.GetTotalClaimsAsync();
            var approvedClaims = await _repo.GetApprovedClaimsAsync();
            var rejectedClaims = await _repo.GetRejectedClaimsAsync();
            var pendingClaims = await _repo.GetPendingClaimsAsync();
            var totalPaid = await _repo.GetTotalPaidAsync();
            var openFraudCases = await _repo.GetOpenFraudCasesAsync();

            return new
            {
                TotalClaims = totalClaims,
                ApprovedClaims = approvedClaims,
                RejectedClaims = rejectedClaims,
                PendingClaims = pendingClaims,
                AutoAdjudicRate = totalClaims > 0
                    ? Math.Round((double)approvedClaims / totalClaims * 100, 2)
                    : 0,
                DenialRate = totalClaims > 0
                    ? Math.Round((double)rejectedClaims / totalClaims * 100, 2)
                    : 0,
                TotalAmountPaid = totalPaid,
                OpenFraudCases = openFraudCases
            };
        }

        // ── KPIs ────────────────────────────────────────

        public async Task<List<KPI>> GetAllKPIsAsync()
        {
            return await _repo.GetAllKPIsAsync();
        }

        public async Task<(bool Success, string Error, KPI? Kpi)> GetKPIByIdAsync(int id)
        {
            var kpi = await _repo.GetKPIByIdAsync(id);
            if (kpi == null)
                return (false, $"KPI with ID {id} not found.", null);

            return (true, "", kpi);
        }

        public async Task<KPI> CreateKPIAsync(KPI kpi)
        {
            return await _repo.CreateKPIAsync(kpi);
        }

        public async Task<(bool Success, string Error)> UpdateKPIAsync(int id, KPI updated)
        {
            var kpi = await _repo.GetKPIByIdAsync(id);
            if (kpi == null)
                return (false, $"KPI with ID {id} not found.");

            kpi.Name = updated.Name;
            kpi.Definition = updated.Definition;
            kpi.Target = updated.Target;
            kpi.CurrentValue = updated.CurrentValue;
            kpi.ReportingPeriod = updated.ReportingPeriod;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteKPIAsync(int id)
        {
            var kpi = await _repo.GetKPIByIdAsync(id);
            if (kpi == null)
                return (false, $"KPI with ID {id} not found.");

            await _repo.DeleteKPIAsync(kpi);
            return (true, "");
        }

        // ── Audit Packages ──────────────────────────────

        public async Task<List<AuditPackage>> GetAllAuditPackagesAsync()
        {
            return await _repo.GetAllAuditPackagesAsync();
        }

        public async Task<(bool Success, string Error, AuditPackage? Package)> GetAuditPackageByIdAsync(int id)
        {
            var package = await _repo.GetAuditPackageByIdAsync(id);
            if (package == null)
                return (false, $"Audit package with ID {id} not found.", null);

            return (true, "", package);
        }

        public async Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package)
        {
            return await _repo.CreateAuditPackageAsync(package);
        }

        public async Task<(bool Success, string Error)> DeleteAuditPackageAsync(int id)
        {
            var package = await _repo.GetAuditPackageByIdAsync(id);
            if (package == null)
                return (false, $"Audit package with ID {id} not found.");

            await _repo.DeleteAuditPackageAsync(package);
            return (true, "");
        }
    }
}