using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;

        public ReportRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Reports ─────────────────────────────────────

        public async Task<List<Report>> GetAllAsync()
        {
            return await _context.Reports
                .Include(r => r.GeneratedByUser)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<Report?> GetByIdWithUserAsync(int id)
        {
            return await _context.Reports
                .Include(r => r.GeneratedByUser)
                .FirstOrDefaultAsync(r => r.ReportID == id);
        }

        public async Task<List<Report>> GetByScopeAsync(ReportScope scope)
        {
            return await _context.Reports
                .Where(r => r.Scope == scope)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        public async Task<Report> CreateAsync(Report report)
        {
            report.GeneratedAt = DateTime.UtcNow;
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report;
        }

        public async Task<Report?> GetByIdAsync(int id)
        {
            return await _context.Reports.FindAsync(id);
        }

        public async Task DeleteReportAsync(Report report)
        {
            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();
        }

        // ── Dashboard ───────────────────────────────────

        public async Task<int> GetTotalClaimsAsync()
        {
            return await _context.Claims.CountAsync();
        }

        public async Task<int> GetApprovedClaimsAsync()
        {
            return await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Adjudicated);
        }

        public async Task<int> GetRejectedClaimsAsync()
        {
            return await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Rejected);
        }

        public async Task<int> GetPendingClaimsAsync()
        {
            return await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Submitted
                                                          || c.Status == ClaimStatus.Validated);
        }

        public async Task<decimal> GetTotalPaidAsync()
        {
            return await _context.Payments
                .Where(p => p.Status == PaymentStatus.Executed)
                .SumAsync(p => p.Amount);
        }

        public async Task<int> GetOpenFraudCasesAsync()
        {
            return await _context.FraudCases
                .CountAsync(f => f.Status != FraudCaseStatus.Resolved);
        }

        // ── KPIs ────────────────────────────────────────

        public async Task<List<KPI>> GetAllKPIsAsync()
        {
            return await _context.KPIs.ToListAsync();
        }

        public async Task<KPI?> GetKPIByIdAsync(int id)
        {
            return await _context.KPIs.FindAsync(id);
        }

        public async Task<KPI> CreateKPIAsync(KPI kpi)
        {
            _context.KPIs.Add(kpi);
            await _context.SaveChangesAsync();
            return kpi;
        }

        public async Task UpdateKPIAsync(KPI kpi)
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteKPIAsync(KPI kpi)
        {
            _context.KPIs.Remove(kpi);
            await _context.SaveChangesAsync();
        }

        // ── Audit Packages ──────────────────────────────

        public async Task<List<AuditPackage>> GetAllAuditPackagesAsync()
        {
            return await _context.AuditPackages
                .OrderByDescending(a => a.GeneratedAt)
                .ToListAsync();
        }

        public async Task<AuditPackage?> GetAuditPackageByIdAsync(int id)
        {
            return await _context.AuditPackages.FindAsync(id);
        }

        public async Task<AuditPackage> CreateAuditPackageAsync(AuditPackage package)
        {
            package.GeneratedAt = DateTime.UtcNow;
            _context.AuditPackages.Add(package);
            await _context.SaveChangesAsync();
            return package;
        }

        public async Task DeleteAuditPackageAsync(AuditPackage package)
        {
            _context.AuditPackages.Remove(package);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}