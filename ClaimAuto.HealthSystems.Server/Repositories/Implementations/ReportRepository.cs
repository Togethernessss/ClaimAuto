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

        public async Task<List<ReportResponseDto>> GetAllReportsAsync(
            string? scope)
        {
            var query = _context.Reports
                .Include(r => r.GeneratedByUser)
                .AsQueryable();

            if (!string.IsNullOrEmpty(scope))
            {
                if (Enum.TryParse<ReportScope>(
                    scope, true, out var scopeEnum))
                {
                    query = query.Where(
                        r => r.Scope == scopeEnum);
                }
            }

            var reports = await query
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();

            return reports.Select(r => new ReportResponseDto
            {
                ReportID = r.ReportID,
                Scope = r.Scope.ToString(),
                ParametersJSON = r.ParametersJSON,
                MetricsJSON = r.MetricsJSON,
                GeneratedByName = r.GeneratedByUser?.Name ?? "System",
                GeneratedAt = r.GeneratedAt,
                ReportURI = r.ReportURI
            }).ToList();
        }

        public async Task<ReportResponseDto?> GetReportByIdAsync(int id)
        {
            var report = await _context.Reports
                .Include(r => r.GeneratedByUser)
                .FirstOrDefaultAsync(r => r.ReportID == id);

            if (report == null)
                return null;

            return new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = report.GeneratedByUser?.Name ?? "System",
                GeneratedAt = report.GeneratedAt,
                ReportURI = report.ReportURI
            };
        }

        public async Task<ReportResponseDto> GenerateReportAsync(
            GenerateReportDto dto,
            int generatedById)
        {
            Enum.TryParse<ReportScope>(
                dto.Scope, true, out var scopeEnum);

            var metrics = await ComputeMetricsAsync(scopeEnum);

            var generatedByName = await _context.Users
                .Where(u => u.UserID == generatedById)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "System";

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

            return new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = generatedByName,
                GeneratedAt = report.GeneratedAt,
                ReportURI = report.ReportURI
            };
        }

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

                    var denialRate = totalClaims > 0 ? Math.Round(
                            (double)denied / totalClaims * 100, 2) : 0;

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

        public async Task<List<KPIResponseDto>> GetAllKPIsAsync()
        {
            var kpis = await _context.KPIs.ToListAsync();

            var totalClaims = await _context.Claims.CountAsync();

            if (totalClaims > 0)
            {
                var autoPaid = await _context.AdjudicationRecords
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Paid
                        && a.PerformedByID == null);

                var autoAdjRate = Math.Round(
                    (double)autoPaid / totalClaims * 100, 2);

                var adjRecords = await _context.AdjudicationRecords
                    .Include(a => a.Claim)
                    .ToListAsync();

                var avgTAT = adjRecords.Any()
                    ? Math.Round(adjRecords
                        .Average(a => (a.ExecutedAt -
                            a.Claim.SubmittedAt).TotalHours), 2)
                    : 0;

                var deniedCount = await _context.AdjudicationRecords
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Denied);

                var denialRate = Math.Round(
                    (double)deniedCount / totalClaims * 100, 2);

                var fraudFlagged = await _context.FraudScores
                    .CountAsync(f => f.ScoreValue >= 70);

                var fraudRate = Math.Round(
                    (double)fraudFlagged / totalClaims * 100, 2);

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

                await _context.SaveChangesAsync();
            }

            return kpis.Select(k => new KPIResponseDto
            {
                KPIID = k.KPIID,
                Name = k.Name,
                Definition = k.Definition,
                Target = k.Target,
                CurrentValue = k.CurrentValue,
                ReportingPeriod = k.ReportingPeriod
            }).ToList();
        }

        public async Task<KPIResponseDto?> UpdateKPIAsync(
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

            return new KPIResponseDto
            {
                KPIID = kpi.KPIID,
                Name = kpi.Name,
                Definition = kpi.Definition,
                Target = kpi.Target,
                CurrentValue = kpi.CurrentValue,
                ReportingPeriod = kpi.ReportingPeriod
            };
        }

        public async Task<List<AuditPackageResponseDto>> GetAllAuditPackagesAsync()
        {
            var packages = await _context.AuditPackages
                .OrderByDescending(p => p.GeneratedAt)
                .ToListAsync();

            return packages.Select(p => new AuditPackageResponseDto
            {
                PackageID = p.PackageID,
                PeriodStart = p.PeriodStart,
                PeriodEnd = p.PeriodEnd,
                ContentsJSON = p.ContentsJSON,
                GeneratedAt = p.GeneratedAt,
                PackageURI = p.PackageURI
            }).ToList();
        }

        public async Task<AuditPackageResponseDto>
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

            return new AuditPackageResponseDto
            {
                PackageID = package.PackageID,
                PeriodStart = package.PeriodStart,
                PeriodEnd = package.PeriodEnd,
                ContentsJSON = package.ContentsJSON,
                GeneratedAt = package.GeneratedAt,
                PackageURI = package.PackageURI
            };
        }
    }
}