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
            var response = await _reportRepository
                .GetAllReportsAsync(scope);

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportById(int id)
        {
            var response = await _reportRepository
                .GetReportByIdAsync(id);

            if (response == null)
                return NotFound($"Report {id} not found.");

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

            var response = await _reportRepository
                .GenerateReportAsync(dto, userId.Value);

            return CreatedAtAction(
                nameof(GetReportById),
                new { id = response.ReportID },
                response);
        }

        [HttpGet("kpis")]
        public async Task<IActionResult> GetAllKPIs()
        {
            var response = await _reportRepository
                .GetAllKPIsAsync();

            return Ok(response);
        }

        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateKPI(int id,
            [FromBody] UpdateKPIDto dto)
        {
            var response = await _reportRepository
                .UpdateKPIAsync(id, dto);

            if (response == null)
                return NotFound($"KPI {id} not found.");

            return Ok(response);
        }

        [HttpGet("audit-packages")]
        public async Task<IActionResult> GetAllAuditPackages()
        {
            var response = await _reportRepository
                .GetAllAuditPackagesAsync();

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

            var response = await _reportRepository
                .GenerateAuditPackageAsync(
                    periodStart, periodEnd, userId.Value);

            return CreatedAtAction(
                nameof(GetAllAuditPackages),
                new { id = response.PackageID },
                response);
        }
    }
}