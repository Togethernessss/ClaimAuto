using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages reports, KPIs, and audit packages. Admin and InsuranceStaff access.</summary>
    [ApiController]
    [Route("api/reports")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [Produces("application/json")]
    public class ReportsController : BaseController
    {
        private readonly IReportRepository _reportRepository;

        public ReportsController(IReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }


        /// <summary>Returns all generated reports with optional scope filter.</summary>
        /// <param name="scope">Filter by scope: Operational, Regulatory, Financial, Fraud.</param>
        /// <response code="200">Returns list of reports.</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllReports(
            [FromQuery] string? scope)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetAllReportsAsync(scope, userOrgId);

            return Ok(response);
        }

        /// <summary>Returns a single report by ID.</summary>
        /// <param name="id">The report ID.</param>
        /// <response code="200">Returns the report.</response>
        /// <response code="404">Report not found.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReportById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetReportByIdAsync(id, userOrgId);

            if (response == null)
                return NotFound($"Report {id} not found.");

            return Ok(response);
        }


        /// <summary>Generates a new report for the specified scope.</summary>
        /// <param name="dto">Report parameters including scope (Operational/Regulatory/Financial/Fraud).</param>
        /// <response code="201">Report generated successfully.</response>
        /// <response code="400">Invalid or missing scope.</response>
        /// <response code="401">Unauthorized.</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping
            var response = await _reportRepository
                .GenerateReportAsync(dto, userId.Value, userOrgId);

            return CreatedAtAction(
                nameof(GetReportById),
                new { id = response.ReportID },
                response);
        }


        /// <summary>Returns all KPI (Key Performance Indicator) records.</summary>
        /// <response code="200">Returns list of KPIs.</response>
        [HttpGet("kpis")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllKPIs()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetAllKPIsAsync(userOrgId);

            return Ok(response);
        }
     


        /// <summary>Updates a KPI record. Admin only.</summary>
        /// <param name="id">The KPI ID to update.</param>
        /// <param name="dto">Updated KPI values.</param>
        /// <response code="200">KPI updated successfully.</response>
        /// <response code="404">KPI not found.</response>
        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateKPI(int id,
            [FromBody] UpdateKPIDto dto)
        {
            var response = await _reportRepository
                .UpdateKPIAsync(id, dto);

            if (response == null)
                return NotFound($"KPI {id} not found.");

            return Ok(response);
        }


        /// <summary>Returns all compliance audit packages.</summary>
        /// <response code="200">Returns list of audit packages. </response>
        [HttpGet("audit-packages")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllAuditPackages()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetAllAuditPackagesAsync(userOrgId);

            return Ok(response);
        }


        /// <summary>Generates a compliance audit package for a specified period. Admin only.</summary>
        /// <param name="periodStart">Start of the audit period (UTC).</param>
        /// <param name="periodEnd">End of the audit period (UTC).</param>
        /// <response code="201">Audit package generated successfully.</response>
        /// <response code="400">PeriodStart must be before PeriodEnd.</response>
        /// <response code="401">Unauthorized.</response>
        [HttpPost("audit-packages")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping
            var response = await _reportRepository
                .GenerateAuditPackageAsync(
                    periodStart, periodEnd, userId.Value, userOrgId);

            return CreatedAtAction(
                nameof(GetAllAuditPackages),
                new { id = response.PackageID },
                response);
        }
    }
}