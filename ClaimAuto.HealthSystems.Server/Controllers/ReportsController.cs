using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class ReportsController : BaseController
    {
        private readonly IReportRepository _reportRepository;

        public ReportsController(IReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllReports(
            [FromQuery] string? scope)
        {
            var reports = await _reportRepository
                .GetAllReportsAsync(scope);

            var response = reports.Select(r =>
                new ReportResponseDto
                {
                    ReportID = r.ReportID,
                    Scope = r.Scope.ToString(),
                    ParametersJSON = r.ParametersJSON,
                    MetricsJSON = r.MetricsJSON,
                    GeneratedByName = r.GeneratedByUser?.Name
                        ?? "System",
                    GeneratedAt = r.GeneratedAt,
                    ReportURI = r.ReportURI
                }).ToList();

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportById(int id)
        {
            var report = await _reportRepository
                .GetReportByIdAsync(id);

            if (report == null)
                return NotFound($"Report {id} not found.");

            var response = new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = report.GeneratedByUser?.Name
                    ?? "System",
                GeneratedAt = report.GeneratedAt,
                ReportURI = report.ReportURI
            };

            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> GenerateReport(
            [FromBody] GenerateReportDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (string.IsNullOrEmpty(dto.Scope))
                return BadRequest("Scope is required.");

            if (!Enum.TryParse<ReportScope>(
                dto.Scope, true, out _))
                return BadRequest(
                    "Invalid scope. Use: Operational, Regulatory, Financial, Fraud");

            var report = await _reportRepository
                .GenerateReportAsync(dto, userId.Value);

            var response = new ReportResponseDto
            {
                ReportID = report.ReportID,
                Scope = report.Scope.ToString(),
                ParametersJSON = report.ParametersJSON,
                MetricsJSON = report.MetricsJSON,
                GeneratedByName = "System",
                GeneratedAt = report.GeneratedAt,
                ReportURI = report.ReportURI
            };

            return CreatedAtAction(
                nameof(GetReportById),
                new { id = report.ReportID },
                response);
        }

        [HttpGet("kpis")]
        public async Task<IActionResult> GetAllKPIs()
        {
            var kpis = await _reportRepository
                .GetAllKPIsAsync();

            var response = kpis.Select(k =>
                new KPIResponseDto
                {
                    KPIID = k.KPIID,
                    Name = k.Name,
                    Definition = k.Definition,
                    Target = k.Target,
                    CurrentValue = k.CurrentValue,
                    ReportingPeriod = k.ReportingPeriod
                }).ToList();

            return Ok(response);
        }

        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateKPI(int id,
            [FromBody] UpdateKPIDto dto)
        {
            var kpi = await _reportRepository
                .UpdateKPIAsync(id, dto);

            if (kpi == null)
                return NotFound($"KPI {id} not found.");

            var response = new KPIResponseDto
            {
                KPIID = kpi.KPIID,
                Name = kpi.Name,
                Definition = kpi.Definition,
                Target = kpi.Target,
                CurrentValue = kpi.CurrentValue,
                ReportingPeriod = kpi.ReportingPeriod
            };

            return Ok(response);
        }

        [HttpGet("audit-packages")]
        public async Task<IActionResult> GetAllAuditPackages()
        {
            var packages = await _reportRepository
                .GetAllAuditPackagesAsync();

            var response = packages.Select(p =>
                new AuditPackageResponseDto
                {
                    PackageID = p.PackageID,
                    PeriodStart = p.PeriodStart,
                    PeriodEnd = p.PeriodEnd,
                    ContentsJSON = p.ContentsJSON,
                    GeneratedAt = p.GeneratedAt,
                    PackageURI = p.PackageURI
                }).ToList();

            return Ok(response);
        }

        [HttpPost("audit-packages")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GenerateAuditPackage(
            [FromQuery] DateTime periodStart,
            [FromQuery] DateTime periodEnd)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (periodStart >= periodEnd)
                return BadRequest(
                    "PeriodStart must be before PeriodEnd.");

            var package = await _reportRepository
                .GenerateAuditPackageAsync(
                    periodStart, periodEnd, userId.Value);

            var response = new AuditPackageResponseDto
            {
                PackageID = package.PackageID,
                PeriodStart = package.PeriodStart,
                PeriodEnd = package.PeriodEnd,
                ContentsJSON = package.ContentsJSON,
                GeneratedAt = package.GeneratedAt,
                PackageURI = package.PackageURI
            };

            return CreatedAtAction(
                nameof(GetAllAuditPackages),
                new { id = package.PackageID },
                response);
        }
    }
}