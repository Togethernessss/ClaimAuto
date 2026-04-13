using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;

        public ReportRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Gets all reports from DB
        // Filters by scope if provided
        public async Task<List<Report>> GetAllReportsAsync(
            string? scope)
        {
            // Start with base query
            var query = _context.Reports.AsQueryable();

            // Apply scope filter if provided
            // e.g. "Operational", "Financial", "Fraud"
            if (!string.IsNullOrEmpty(scope))
            {
                if (Enum.TryParse<ReportScope>(
                    scope, true, out var scopeEnum))
                {
                    query = query.Where(
                        r => r.Scope == scopeEnum);
                }
            }

            // Return newest reports first
            return await query
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
        }

        // Gets single report by ID
        // Returns null if not found
        public async Task<Report?> GetReportByIdAsync(int id)
        {
            return await _context.Reports
                .Include(r => r.GeneratedByUser)
                .FirstOrDefaultAsync(r => r.ReportID == id);
        }

        // Generates a new report
        // Reads from Claims, Payments, AdjudicationRecords
        // Computes metrics and saves to DB
        public async Task<Report> GenerateReportAsync(
            GenerateReportDto dto,
            int generatedById)
        {
            // Parse scope string to enum
            Enum.TryParse<ReportScope>(
                dto.Scope, true, out var scopeEnum);

            // Compute metrics based on scope
            var metrics = await ComputeMetricsAsync(scopeEnum);


            var report = new Report
            {
                Scope = scopeEnum,
                ParametersJSON = dto.ParametersJSON,
                MetricsJSON = metrics,
                GeneratedBy = generatedById,
                GeneratedAt = DateTime.UtcNow
            };


            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return report;
        }

        // ── Helper — ComputeMetricsAsync ─────────────────────
        // Computes metrics based on report scope
        // Reads from relevant tables
        private async Task<string> ComputeMetricsAsync(
            ReportScope scope)
        {
            switch (scope)
            {
                case ReportScope.Operational:
                    var totalClaims = await _context.Claims
                        .CountAsync();

                    var autoPaid = await _context
                        .AdjudicationRecords
                        .CountAsync(a =>
                            a.Decision == AdjDecision.Paid
                            && a.PerformedByID == null);

                    var denied = await _context
                        .AdjudicationRecords
                        .CountAsync(a =>
                            a.Decision == AdjDecision.Denied);

                    var denialRate = totalClaims > 0
                        ? Math.Round(
                            (double)denied / totalClaims * 100, 2)
                        : 0;

                    return System.Text.Json.JsonSerializer
                        .Serialize(new
                        {
                            totalClaims,
                            autoPaid,
                            denied,
                            denialRate = $"{denialRate}%"
                        });

                case ReportScope.Financial:
                    // Read from Payments
                    var totalPayments = await _context.Payments
                        .CountAsync();

                    var totalPaid = await _context.Payments
                        .Where(p =>
                            p.Status == PaymentStatus.Executed)
                        .SumAsync(p => p.Amount);

                    var pendingPayments = await _context.Payments
                        .CountAsync(p =>
                            p.Status == PaymentStatus.Pending);

                    return System.Text.Json.JsonSerializer
                        .Serialize(new
                        {
                            totalPayments,
                            totalPaid,
                            pendingPayments
                        });

                case ReportScope.Fraud:
                    // Read from FraudScores + FraudCases
                    var totalScored = await _context.FraudScores
                        .CountAsync();

                    var highRisk = await _context.FraudScores
                        .CountAsync(f => f.ScoreValue >= 70);

                    var casesOpened = await _context.FraudCases
                        .CountAsync();

                    var casesResolved = await _context.FraudCases
                        .CountAsync(f =>
                            f.Status == FraudCaseStatus.Resolved);

                    return System.Text.Json.JsonSerializer
                        .Serialize(new
                        {
                            totalScored,
                            highRisk,
                            casesOpened,
                            casesResolved
                        });

                case ReportScope.Regulatory:
                    // Read from AuditLogs
                    var totalLogs = await _context.AuditLogs
                        .CountAsync();

                    var totalAdjudications = await _context
                        .AdjudicationRecords
                        .CountAsync();

                    return System.Text.Json.JsonSerializer
                        .Serialize(new
                        {
                            totalLogs,
                            totalAdjudications
                        });

                default:
                    return "{}";
            }
        }

        
        public async Task<List<KPI>> GetAllKPIsAsync()
        {
            return await _context.KPIs.ToListAsync();
        }

        // Admin updates KPI target or current value
        // Returns null if KPI not found
        public async Task<KPI?> UpdateKPIAsync(
            int id,
            UpdateKPIDto dto)
        {
            // Find KPI by ID
            var kpi = await _context.KPIs
                .FirstOrDefaultAsync(k => k.KPIID == id);

            // Not found → return null
            if (kpi == null)
                return null;

            // Update only provided fields
            // If null → keep existing value
            if (dto.Target.HasValue)
                kpi.Target = dto.Target.Value;

            if (dto.CurrentValue.HasValue)
                kpi.CurrentValue = dto.CurrentValue.Value;

            if (!string.IsNullOrEmpty(dto.ReportingPeriod))
                kpi.ReportingPeriod = dto.ReportingPeriod;

            // Save changes
            await _context.SaveChangesAsync();

            return kpi;
        }

        // Gets all audit packages
        // Newest first
        public async Task<List<AuditPackage>>
            GetAllAuditPackagesAsync()
        {
            return await _context.AuditPackages
                .OrderByDescending(p => p.GeneratedAt)
                .ToListAsync();
        }

        // Generates new audit package for a period
        // Reads AuditLogs + AdjudicationRecords + Reports
        // Bundles summary into ContentsJSON
        public async Task<AuditPackage>
            GenerateAuditPackageAsync(
                DateTime periodStart,
                DateTime periodEnd,
                int generatedById)
        {
            // Count AuditLogs in period
            var auditLogCount = await _context.AuditLogs
                .CountAsync(a =>
                    a.Timestamp >= periodStart
                    && a.Timestamp <= periodEnd);

            // Count AdjudicationRecords in period
            var adjRecordCount = await _context
                .AdjudicationRecords
                .CountAsync(a =>
                    a.ExecutedAt >= periodStart
                    && a.ExecutedAt <= periodEnd);

            // Get Report IDs generated in period
            var reportIds = await _context.Reports
                .Where(r =>
                    r.GeneratedAt >= periodStart
                    && r.GeneratedAt <= periodEnd)
                .Select(r => r.ReportID)
                .ToListAsync();

            // Build ContentsJSON
            var contents = System.Text.Json.JsonSerializer
                .Serialize(new
                {
                    auditLogs = auditLogCount,
                    adjudicationRecords = adjRecordCount,
                    reports = reportIds,
                    periodStart = periodStart
                        .ToString("yyyy-MM-dd"),
                    periodEnd = periodEnd
                        .ToString("yyyy-MM-dd")
                });

            // Build AuditPackage model
            var package = new AuditPackage
            {
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                ContentsJSON = contents,
                GeneratedAt = DateTime.UtcNow
            };

            _context.AuditPackages.Add(package);
            await _context.SaveChangesAsync();

            return package;
        }
    }
}