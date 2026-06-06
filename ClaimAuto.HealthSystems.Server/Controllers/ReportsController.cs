using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages reports, KPIs, and audit packages.</summary>
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

        /// <summary>Returns all generated reports.</summary>
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

            if (!Enum.TryParse<ReportScope>(dto.Scope, true, out _))
                return BadRequest(
                    "Invalid scope. Use: Operational, " +
                    "Regulatory, Financial, Fraud");

            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GenerateReportAsync(dto, userId.Value, userOrgId);

            return CreatedAtAction(
                nameof(GetReportById),
                new { id = response.ReportID },
                response);
        }

        /// <summary>Downloads the PDF for a report.</summary>
        [HttpGet("{id}/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReportPdf(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var pdfBytes = await _reportRepository
                .GetReportPdfAsync(id);

            if (pdfBytes == null || pdfBytes.Length == 0)
                return NotFound(
                    $"PDF not found for Report {id}.");

            return File(
                pdfBytes,
                "application/pdf",
                $"Report-RPT-{id}.pdf");
        }

        /// <summary>Returns all KPIs.</summary>
        [HttpGet("kpis")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllKPIs()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetAllKPIsAsync(userOrgId);
            return Ok(response);
        }

        /// <summary>Updates a KPI. Admin only.</summary>
        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateKPI(
            int id, [FromBody] UpdateKPIDto dto)
        {
            // ── SaaS: verify KPI belongs to this tenant ───────────────
            var userOrgId = GetLoggedInUserOrgId();
            var allKPIs = await _reportRepository
                .GetAllKPIsAsync(userOrgId);
            var kpiExists = allKPIs.Any(k => k.KPIID == id);
            if (!kpiExists)
                return NotFound($"KPI {id} not found.");

            var response = await _reportRepository
                .UpdateKPIAsync(id, dto);
            if (response == null)
                return NotFound($"KPI {id} not found.");
            return Ok(response);
        }

        /// <summary>Returns all audit packages.</summary>
        [HttpGet("audit-packages")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllAuditPackages()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GetAllAuditPackagesAsync(userOrgId);
            return Ok(response);
        }

        /// <summary>Generates a compliance audit package. Admin only.</summary>
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

            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GenerateAuditPackageAsync(
                    periodStart, periodEnd,
                    userId.Value, userOrgId);

            return CreatedAtAction(
                nameof(GetAllAuditPackages),
                new { id = response.PackageID },
                response);
        }

        /// <summary>Downloads the PDF for an audit package. Admin only.</summary>
        [HttpGet("audit-packages/{id}/pdf")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAuditPackagePdf(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var userOrgId = GetLoggedInUserOrgId();

            var pdfBytes = await _reportRepository
                .GetAuditPackagePdfAsync(id, userOrgId);

            if (pdfBytes == null || pdfBytes.Length == 0)
                return NotFound(
                    $"PDF not found for Audit Package {id}.");

            return File(
                pdfBytes,
                "application/pdf",
                $"AuditPackage-PKG-{id}.pdf");
        }
    }
}