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
        private readonly IReportPdfService _reportPdfService;
        private readonly IAuditPackagePdfService _auditPackagePdfService;

        public ReportRepository(
            ApplicationDbContext context,
            IReportPdfService reportPdfService,
            IAuditPackagePdfService auditPackagePdfService)
        {
            _context = context;
            _reportPdfService = reportPdfService;
            _auditPackagePdfService = auditPackagePdfService;
        }

        // ── GET ALL REPORTS ───────────────────────────────────────────
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

        // ── GET REPORT BY ID ──────────────────────────────────────────
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

        // ── GENERATE REPORT ───────────────────────────────────────────
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

            // ── Audit log ─────────────────────────────────────────────
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
                OrganizationID = userOrgId,
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
                    _reportPdfService.GenerateReportPdf(report);
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

        // ── COMPUTE METRICS ───────────────────────────────────────────
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
                            a.Decision == AdjDecision.Approved
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

        // ── GET ALL KPIs ──────────────────────────────────────────────
        public async Task<List<KPIResponseDto>> GetAllKPIsAsync(
            int? userOrgId = null)
        {
            var query = _context.KPIs.AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(
                    k => k.OrganizationID == userOrgId.Value);

            var kpis = await query.ToListAsync();
            var totalClaims = await _context.Claims
                .Where(c => !userOrgId.HasValue || c.OrganizationID == userOrgId.Value)
                .CountAsync();

            if (totalClaims > 0)
            {
                // Count all auto-adjudicated claims (PerformedByID == null means
                // the rule engine processed it — regardless of Approved/Denied outcome)
                var autoPaid = await _context.AdjudicationRecords
                    .Where(a => !userOrgId.HasValue || a.OrganizationID == userOrgId.Value)
                    .CountAsync(a => a.PerformedByID == null);

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

        // ── UPDATE KPI ────────────────────────────────────────────────
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

        // ── GET ALL AUDIT PACKAGES ────────────────────────────────────
        public async Task<List<AuditPackageResponseDto>>
            GetAllAuditPackagesAsync(int? userOrgId = null)
        {
            var query = _context.AuditPackages
                .Include(p => p.GeneratedByUser)
                .AsQueryable();

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
                GeneratedByName = p.GeneratedByUser?.Name ?? "System",
                HasPDF = p.PackageFilePDF != null
                                  && p.PackageFilePDF.Length > 0,
            }).ToList();
        }

        // ── GENERATE AUDIT PACKAGE ────────────────────────────────────
        public async Task<AuditPackageResponseDto>
            GenerateAuditPackageAsync(
                DateTime periodStart,
                DateTime periodEnd,
                int generatedById,
                int? userOrgId = null)
        {
            // ── End of day fix — includes full last day ───────────────
            var endOfDay = periodEnd.Date.AddDays(1).AddTicks(-1);
            // e.g. 30 May → 2026-05-30 23:59:59.9999999 ✅

            // ── Section 2: Claims ─────────────────────────────────────
            var claimsQuery = _context.Claims
                .Where(c =>
                    c.SubmittedAt >= periodStart &&
                    c.SubmittedAt <= endOfDay);
            if (userOrgId.HasValue)
                claimsQuery = claimsQuery.Where(
                    c => c.OrganizationID == userOrgId.Value);

            var claims = await claimsQuery.ToListAsync();
            var totalClaims = claims.Count;
            var claimsByStatus = claims
                .GroupBy(c => c.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            // ── Section 3: Payments ───────────────────────────────────
            var paymentsQuery = _context.Payments
                .Where(p =>
                    p.CreatedAt >= periodStart &&
                    p.CreatedAt <= endOfDay);
            if (userOrgId.HasValue)
                paymentsQuery = paymentsQuery.Where(
                    p => p.OrganizationID == userOrgId.Value);

            var payments = await paymentsQuery.ToListAsync();
            var totalPayments = payments.Count;
            var executedPayments = payments.Count(
                p => p.Status == PaymentStatus.Executed);
            var pendingPayments = payments.Count(
                p => p.Status == PaymentStatus.Pending);
            var onHoldPayments = payments.Count(
                p => p.Status == PaymentStatus.OnHold);
            var totalAmountPaid = payments
                .Where(p => p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);

            // ── Section 4: Adjudication ───────────────────────────────
            var adjQuery = _context.AdjudicationRecords
                .Where(a =>
                    a.ExecutedAt >= periodStart &&
                    a.ExecutedAt <= endOfDay);
            if (userOrgId.HasValue)
                adjQuery = adjQuery.Where(
                    a => a.OrganizationID == userOrgId.Value);

            var adjRecords = await adjQuery.ToListAsync();
            var totalAdj = adjRecords.Count;
            var autoAdj = adjRecords.Count(
                a => a.PerformedByID == null);
            var manualAdj = adjRecords.Count(
                a => a.PerformedByID != null);
            var adjApproved = adjRecords.Count(
                a => a.Decision == AdjDecision.Approved);
            var adjDenied = adjRecords.Count(
                a => a.Decision == AdjDecision.Denied);
            var denialRate = totalClaims > 0
                ? Math.Round(
                    (double)adjDenied / totalClaims * 100, 2)
                : 0;

            // ── Section 5: Remittances ────────────────────────────────
            var remitQuery = _context.Remittances
                .Include(r => r.Payment)
                .Where(r =>
                    r.GeneratedAt >= periodStart &&
                    r.GeneratedAt <= endOfDay);
            if (userOrgId.HasValue)
                remitQuery = remitQuery.Where(
                    r => r.Payment.OrganizationID == userOrgId.Value);

            var remittances = await remitQuery.ToListAsync();
            var totalRemittances = remittances.Count;
            var remittancesSent = remittances.Count(
                r => r.Status == RemittanceStatus.Sent);
            var remittancesAcknowledged = remittances.Count(
                r => r.Status == RemittanceStatus.Acknowledged);
            var remittancesPending = remittances.Count(
                r => r.Status == RemittanceStatus.Generated);

            // ── Section 6: Fraud Scores ───────────────────────────────
            var fraudScoreQuery = _context.FraudScores
                .Where(f =>
                    f.GeneratedAt >= periodStart &&
                    f.GeneratedAt <= endOfDay);
            if (userOrgId.HasValue)
                fraudScoreQuery = fraudScoreQuery.Where(
                    f => f.OrganizationID == userOrgId.Value);

            var fraudScores = await fraudScoreQuery.ToListAsync();
            var totalScored = fraudScores.Count;
            var highRisk = fraudScores.Count(
                f => f.ScoreValue >= 70);
            var fraudRate = totalClaims > 0
                ? Math.Round(
                    (double)highRisk / totalClaims * 100, 2)
                : 0;

            // ── Section 6: Fraud Cases ────────────────────────────────
            var fraudCaseQuery = _context.FraudCases
                .Where(f =>
                    f.OpenedAt >= periodStart &&
                    f.OpenedAt <= endOfDay);
            if (userOrgId.HasValue)
                fraudCaseQuery = fraudCaseQuery.Where(
                    f => f.OrganizationID == userOrgId.Value);

            var fraudCases = await fraudCaseQuery.ToListAsync();
            var casesOpened = fraudCases.Count;
            var casesResolved = fraudCases.Count(
                f => f.Status == FraudCaseStatus.Resolved);

            // ── Section 7: Audit Logs ─────────────────────────────────
            var logsQuery = _context.AuditLogs
                .Where(a =>
                    a.Timestamp >= periodStart &&
                    a.Timestamp <= endOfDay);
            if (userOrgId.HasValue)
                logsQuery = logsQuery.Where(
                    a => a.OrganizationID == userOrgId.Value);

            var logs = await logsQuery.ToListAsync();
            var totalLogs = logs.Count;
            var paymentLogs = logs.Count(
                a => a.ResourceType == "Payment");
            var claimLogs = logs.Count(
                a => a.ResourceType == "Claim");
            var remittanceLogs = logs.Count(
                a => a.ResourceType == "Remittance");
            var reconciliationLogs = logs.Count(
                a => a.ResourceType == "Reconciliation");
            var reportLogs = logs.Count(
                a => a.ResourceType == "Report");
            var otherLogs = totalLogs
                - paymentLogs - claimLogs
                - remittanceLogs - reconciliationLogs
                - reportLogs;

            // ── Section 8: Reports ────────────────────────────────────
            var reportsQuery = _context.Reports
                .Include(r => r.GeneratedByUser)
                .Where(r =>
                    r.GeneratedAt >= periodStart &&
                    r.GeneratedAt <= endOfDay);
            if (userOrgId.HasValue)
                reportsQuery = reportsQuery.Where(
                    r => r.OrganizationID == userOrgId.Value);

            var reportsList = await reportsQuery
                .OrderBy(r => r.GeneratedAt)
                .ToListAsync();

            // ── Section 9: KPIs ───────────────────────────────────────
            var kpisQuery = _context.KPIs.AsQueryable();
            if (userOrgId.HasValue)
                kpisQuery = kpisQuery.Where(
                    k => k.OrganizationID == userOrgId.Value);
            var kpis = await kpisQuery.ToListAsync();

            // ── Organization name ─────────────────────────────────────
            var orgName = "ClaimAuto Health Insurance";
            if (userOrgId.HasValue)
            {
                var org = await _context.Organizations
                    .FirstOrDefaultAsync(
                        o => o.OrganizationID == userOrgId.Value);
                if (org != null) orgName = org.Name;
            }

            // ── Generated by name ─────────────────────────────────────
            var generatedByName = await _context.Users
                .Where(u => u.UserID == generatedById)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "System";

            // ── ContentsJSON ──────────────────────────────────────────
            var contents = System.Text.Json.JsonSerializer.Serialize(
                new
                {
                    auditLogs = totalLogs,
                    adjudicationRecords = totalAdj,
                    reports = reportsList
                        .Select(r => r.ReportID).ToList(),
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
                GeneratedByID = generatedById,
                OrganizationID = userOrgId,
            };

            _context.AuditPackages.Add(package);
            await _context.SaveChangesAsync();

            // ── Audit log ─────────────────────────────────────────────
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = generatedById,
                Action = "GenerateAuditPackage",
                ResourceType = "AuditPackage",
                ResourceID = package.PackageID.ToString(),
                DetailsJSON =
                    $"{{\"packageID\":{package.PackageID}," +
                    $"\"periodStart\":\"{periodStart:yyyy-MM-dd}\"," +
                    $"\"periodEnd\":\"{periodEnd:yyyy-MM-dd}\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId,
            });
            await _context.SaveChangesAsync();

            // ── Build PDF data ────────────────────────────────────────
            var pdfData = new AuditPackageData
            {
                OrganizationName = orgName,
                GeneratedByName = generatedByName,
                TotalClaims = totalClaims,
                ClaimsSubmitted = claimsByStatus
                    .GetValueOrDefault(ClaimStatus.Submitted),
                ClaimsUnderReview = claimsByStatus
                    .GetValueOrDefault(ClaimStatus.UnderReview),
                ClaimsValidated = 0,    // status removed from enum
                ClaimsAdjudicated = 0,  // status removed from enum
                ClaimsApproved = claimsByStatus
                    .GetValueOrDefault(ClaimStatus.Approved),
                ClaimsPaid = claimsByStatus
                    .GetValueOrDefault(ClaimStatus.Paid),
                ClaimsRejected = claimsByStatus
                    .GetValueOrDefault(ClaimStatus.Rejected),
                TotalPayments = totalPayments,
                ExecutedPayments = executedPayments,
                PendingPayments = pendingPayments,
                OnHoldPayments = onHoldPayments,
                TotalAmountPaid = totalAmountPaid,
                TotalAdjudications = totalAdj,
                AutoAdjudicated = autoAdj,
                ManualAdjudicated = manualAdj,
                AdjApproved = adjApproved,
                AdjDenied = adjDenied,
                DenialRate = denialRate,
                TotalRemittances = totalRemittances,
                RemittancesSent = remittancesSent,
                RemittancesAcknowledged = remittancesAcknowledged,
                RemittancesPending = remittancesPending,
                TotalScored = totalScored,
                HighRisk = highRisk,
                CasesOpened = casesOpened,
                CasesResolved = casesResolved,
                FraudRate = fraudRate,
                TotalLogs = totalLogs,
                PaymentLogs = paymentLogs,
                ClaimLogs = claimLogs,
                RemittanceLogs = remittanceLogs,
                ReconciliationLogs = reconciliationLogs,
                ReportLogs = reportLogs,
                OtherLogs = Math.Max(otherLogs, 0),
                Reports = reportsList.Select(r =>
                    new ReportSummaryItem
                    {
                        ReportID = r.ReportID,
                        Scope = r.Scope.ToString(),
                        GeneratedAt = r.GeneratedAt,
                        GeneratedBy = r.GeneratedByUser?.Name
                                      ?? "System",
                    }).ToList(),
                KPIs = kpis.Select(k => new KPISummaryItem
                {
                    Name = k.Name,
                    Target = k.Target.HasValue
                        ? $"{k.Target.Value:F2}" : "—",
                    CurrentValue = k.CurrentValue.HasValue
                        ? $"{k.CurrentValue.Value:F2}" : "—",
                    OnTarget = k.Target.HasValue
                        && k.CurrentValue.HasValue
                        && k.CurrentValue.Value >= k.Target.Value,
                }).ToList(),
            };

            // ── Generate and store PDF ────────────────────────────────
            try
            {
                package.PackageFilePDF =
                    _auditPackagePdfService
                        .GenerateAuditPackagePdf(package, pdfData);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[AUDIT PKG PDF ERROR] " +
                    $"PackageID {package.PackageID}: {ex.Message}");
                package.PackageFilePDF = null;
            }

            return new AuditPackageResponseDto
            {
                PackageID = package.PackageID,
                PeriodStart = package.PeriodStart,
                PeriodEnd = package.PeriodEnd,
                ContentsJSON = package.ContentsJSON,
                GeneratedAt = package.GeneratedAt,
                GeneratedByName = generatedByName,
                HasPDF = package.PackageFilePDF != null
                                  && package.PackageFilePDF.Length > 0,
            };
        }

        // ── GET AUDIT PACKAGE PDF ─────────────────────────────────────
        public async Task<byte[]?> GetAuditPackagePdfAsync(
            int packageId, int? userOrgId = null)
        {
            var query = _context.AuditPackages
                .Where(p => p.PackageID == packageId);

            if (userOrgId.HasValue)
                query = query.Where(
                    p => p.OrganizationID == userOrgId.Value);

            var package = await query.FirstOrDefaultAsync();
            return package?.PackageFilePDF;
        }
    }
}