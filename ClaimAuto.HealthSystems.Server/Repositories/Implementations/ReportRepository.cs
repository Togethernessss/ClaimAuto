using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly IReportPdfService _pdfService;

        public ReportRepository(
            ApplicationDbContext context,
            IReportPdfService pdfService)
        {
            _context = context;
            _pdfService = pdfService;
        }

        public async Task<List<ReportResponseDto>> GetAllReportsAsync(
            string? scope, int? userOrgId = null)
        {
            var query = _context.Reports
                .Include(r => r.GeneratedByUser)
                .AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(
                    r => r.OrganizationID == userOrgId.Value);

            if (!string.IsNullOrEmpty(scope))
                if (Enum.TryParse<ReportScope>(
                    scope, true, out var scopeEnum))
                    query = query.Where(
                        r => r.Scope == scopeEnum);

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
                HasPDF = r.ReportFilePDF != null
                                  && r.ReportFilePDF.Length > 0,
            }).ToList();
        }

        public async Task<ReportResponseDto?> GetReportByIdAsync(
            int id, int? userOrgId = null)
        {
            var query = _context.Reports
                .Include(r => r.GeneratedByUser)
                .Where(r => r.ReportID == id);

            if (userOrgId.HasValue)
                query = query.Where(
                    r => r.OrganizationID == userOrgId.Value);

            var report = await query.FirstOrDefaultAsync();
            if (report == null) return null;

            return new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = report.GeneratedByUser?.Name
                                  ?? "System",
                GeneratedAt = report.GeneratedAt,
                HasPDF = report.ReportFilePDF != null
                                  && report.ReportFilePDF.Length > 0,
            };
        }

        public async Task<ReportResponseDto> GenerateReportAsync(
            GenerateReportDto dto,
            int generatedById,
            int? userOrgId = null)
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
                GeneratedAt = DateTime.UtcNow,
                OrganizationID = userOrgId,
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            // ── Audit log — Report generated ──────────────────────────
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = generatedById,
                Action = "GenerateReport",
                ResourceType = "Report",
                ResourceID = report.ReportID.ToString(),
                DetailsJSON = $"{{\"reportID\":{report.ReportID}," +
                                 $"\"scope\":\"{report.Scope}\"," +
                                 $"\"generatedBy\":{generatedById}}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId, // ← SaaS
            });
            await _context.SaveChangesAsync();

            // ── Load navigation property for PDF ─────────────────────
            await _context.Entry(report)
                .Reference(r => r.GeneratedByUser)
                .LoadAsync();

            // ── Generate and store PDF ────────────────────────────────
            try
            {
                report.ReportFilePDF =
                    _pdfService.GenerateReportPdf(report);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[REPORT PDF ERROR] " +
                    $"ReportID {report.ReportID}: {ex.Message}");
                report.ReportFilePDF = null;
            }

            return new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = generatedByName,
                GeneratedAt = report.GeneratedAt,
                HasPDF = report.ReportFilePDF != null
                                  && report.ReportFilePDF.Length > 0,
            };
        }

        // ── GET REPORT PDF ────────────────────────────────────────────
        public async Task<byte[]?> GetReportPdfAsync(int id)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.ReportID == id);
            return report?.ReportFilePDF;
        }

        private async Task<string> ComputeMetricsAsync(
            ReportScope scope)
        {
            switch (scope)
            {
                case ReportScope.Operational:
                    var totalClaims = await _context.Claims
                        .CountAsync();
                    var autoPaid = await _context.AdjudicationRecords
                        .CountAsync(a =>
                            a.Decision == AdjDecision.Paid
                            && a.PerformedByID == null);
                    var denied = await _context.AdjudicationRecords
                        .CountAsync(a =>
                            a.Decision == AdjDecision.Denied);
                    var denialRate = totalClaims > 0
                        ? Math.Round(
                            (double)denied / totalClaims * 100, 2)
                        : 0;
                    return System.Text.Json.JsonSerializer.Serialize(
                        new
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
                    return System.Text.Json.JsonSerializer.Serialize(
                        new { totalPayments, totalPaid, pendingPayments });

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
                    return System.Text.Json.JsonSerializer.Serialize(
                        new
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
                        .AdjudicationRecords.CountAsync();
                    return System.Text.Json.JsonSerializer.Serialize(
                        new { totalLogs, totalAdjudications });

                default:
                    return "{}";
            }
        }

        public async Task<List<KPIResponseDto>> GetAllKPIsAsync(
            int? userOrgId = null)
        {
            var query = _context.KPIs.AsQueryable();

            var kpis = await query.ToListAsync();
            var totalClaims = await _context.Claims
                .Where(c => !userOrgId.HasValue || c.OrganizationID == userOrgId.Value)
                .CountAsync();

            if (totalClaims > 0)
            {
                var autoPaid = await _context.AdjudicationRecords
                    .Where(a => !userOrgId.HasValue || a.OrganizationID == userOrgId.Value)
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Paid
                        && a.PerformedByID == null);

                var autoAdjRate = Math.Min(Math.Round(
                    (double)autoPaid / totalClaims * 100, 2), 100);

                var adjRecords = await _context.AdjudicationRecords
                    .Include(a => a.Claim)
                    .Where(a => !userOrgId.HasValue || a.OrganizationID == userOrgId.Value)
                    .ToListAsync();

                var avgTAT = adjRecords.Any()
                    ? Math.Round(adjRecords.Average(
                        a => (a.ExecutedAt -
                              a.Claim.SubmittedAt).TotalHours), 2)
                    : 0;

                var deniedCount = await _context.AdjudicationRecords
                    .Where(a => !userOrgId.HasValue || a.OrganizationID == userOrgId.Value)
                    .CountAsync(a =>
                        a.Decision == AdjDecision.Denied);

                var denialRate = Math.Min(Math.Round(
                    (double)deniedCount / totalClaims * 100, 2), 100);

                var fraudFlagged = await _context.FraudScores
                    .Where(f => !userOrgId.HasValue || f.OrganizationID == userOrgId.Value)
                    .CountAsync(f => f.ScoreValue >= 70);

                var fraudRate = Math.Min(Math.Round(
                    (double)fraudFlagged / totalClaims * 100, 2), 100);

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
            int id, UpdateKPIDto dto)
        {
            var kpi = await _context.KPIs
                .FirstOrDefaultAsync(k => k.KPIID == id);

            if (kpi == null) return null;

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

        public async Task<List<AuditPackageResponseDto>>
            GetAllAuditPackagesAsync(int? userOrgId = null)
        {
            var query = _context.AuditPackages.AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(
                    p => p.OrganizationID == userOrgId.Value);

            var packages = await query
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
                int generatedById,
                int? userOrgId = null)
        {
            var auditLogCount = await _context.AuditLogs
                .CountAsync(a =>
                    a.Timestamp >= periodStart &&
                    a.Timestamp <= periodEnd);

            var adjRecordCount = await _context.AdjudicationRecords
                .CountAsync(a =>
                    a.ExecutedAt >= periodStart &&
                    a.ExecutedAt <= periodEnd);

            var reportIds = await _context.Reports
                .Where(r =>
                    r.GeneratedAt >= periodStart &&
                    r.GeneratedAt <= periodEnd)
                .Select(r => r.ReportID)
                .ToListAsync();

            var contents = System.Text.Json.JsonSerializer.Serialize(
                new
                {
                    auditLogs = auditLogCount,
                    adjudicationRecords = adjRecordCount,
                    reports = reportIds,
                    periodStart =
                        periodStart.ToString("yyyy-MM-dd"),
                    periodEnd =
                        periodEnd.ToString("yyyy-MM-dd")
                });

            var package = new AuditPackage
            {
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                ContentsJSON = contents,
                GeneratedAt = DateTime.UtcNow,
                OrganizationID = userOrgId,
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