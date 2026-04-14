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
            var query = _context.Reports.AsQueryable();

            if (!string.IsNullOrEmpty(scope))
            {
                if (Enum.TryParse<ReportScope>(
                    scope, true, out var scopeEnum))
                {
                    query = query.Where(
                        r => r.Scope == scopeEnum);
                }
            }

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
            Enum.TryParse<ReportScope>(
                dto.Scope, true, out var scopeEnum);

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

        // Computes metrics based on report scope
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

        // Gets all KPIs
        // Calculates CurrentValue LIVE from database
        // Updates automatically when claims are processed
        public async Task<List<KPI>> GetAllKPIsAsync()
        {
            // Get all KPIs from DB
            var kpis = await _context.KPIs.ToListAsync();

            // Get total claims for rate calculations
            var totalClaims = await _context.Claims.CountAsync();

            if (totalClaims > 0)
            {
                // ── KPI 1 — Auto-Adjudication Rate ──────────
                // % of claims auto-processed without human review
                var autoPaid = await _context.AdjudicationRecords
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Paid
                        && a.PerformedByID == null);

                var autoAdjRate = Math.Round(
                    (double)autoPaid / totalClaims * 100, 2);

                // ── KPI 2 — Average TAT ──────────────────────
                // Average hours from submission to adjudication
                var adjRecords = await _context.AdjudicationRecords
                    .Include(a => a.Claim)
                    .ToListAsync();

                var avgTAT = adjRecords.Any()
                    ? Math.Round(adjRecords
                        .Average(a => (a.ExecutedAt -
                            a.Claim.SubmittedAt).TotalHours), 2)
                    : 0;

                // ── KPI 3 — Denial Rate ──────────────────────
                // % of claims denied
                var denied = await _context.AdjudicationRecords
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Denied);

                var denialRate = Math.Round(
                    (double)denied / totalClaims * 100, 2);

                // ── KPI 4 — Fraud Flag Rate ──────────────────
                // % of claims flagged with high fraud score
                var fraudFlagged = await _context.FraudScores
                    .CountAsync(f => f.ScoreValue >= 70);

                var fraudRate = Math.Round(
                    (double)fraudFlagged / totalClaims * 100, 2);

                // ── Update CurrentValue for each KPI ────────
                foreach (var kpi in kpis)
                {
                    switch (kpi.Name)
                    {
                        case "Auto-Adjudication Rate":
                            kpi.CurrentValue = (decimal)autoAdjRate;
                            break;

                        case "Average TAT":
                            kpi.CurrentValue = (decimal)avgTAT;
                            break;

                        case "Denial Rate":
                            kpi.CurrentValue = (decimal)denialRate;
                            break;

                        case "Fraud Flag Rate":
                            kpi.CurrentValue = (decimal)fraudRate;
                            break;
                    }
                }

                // Save updated CurrentValues to DB
                await _context.SaveChangesAsync();
            }

            return kpis;
        }

        // Admin updates KPI target or current value
        // Returns null if KPI not found
        public async Task<KPI?> UpdateKPIAsync(
            int id,
            UpdateKPIDto dto)
        {
            var kpi = await _context.KPIs
                .FirstOrDefaultAsync(k => k.KPIID == id);

            if (kpi == null)
                return null;

            if (dto.Target.HasValue)
                kpi.Target = dto.Target.Value;

            if (dto.CurrentValue.HasValue)
                kpi.CurrentValue = dto.CurrentValue.Value;

            if (!string.IsNullOrEmpty(dto.ReportingPeriod))
                kpi.ReportingPeriod = dto.ReportingPeriod;

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
        public async Task<AuditPackage>
            GenerateAuditPackageAsync(
                DateTime periodStart,
                DateTime periodEnd,
                int generatedById)
        {
            var auditLogCount = await _context.AuditLogs
                .CountAsync(a =>
                    a.Timestamp >= periodStart
                    && a.Timestamp <= periodEnd);

            var adjRecordCount = await _context
                .AdjudicationRecords
                .CountAsync(a =>
                    a.ExecutedAt >= periodStart
                    && a.ExecutedAt <= periodEnd);

            var reportIds = await _context.Reports
                .Where(r =>
                    r.GeneratedAt >= periodStart
                    && r.GeneratedAt <= periodEnd)
                .Select(r => r.ReportID)
                .ToListAsync();

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