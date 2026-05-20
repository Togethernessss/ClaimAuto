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

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllReports([FromQuery] string? scope)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository.GetAllReportsAsync(scope, userOrgId);
            return Ok(response);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReportById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository.GetReportByIdAsync(id, userOrgId);

            if (response == null)
                return NotFound($"Report {id} not found.");

            return Ok(response);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GenerateReport([FromBody] GenerateReportDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (string.IsNullOrEmpty(dto.Scope))
                return BadRequest("Scope is required.");

            if (!Enum.TryParse<ReportScope>(dto.Scope, true, out _))
                return BadRequest("Invalid scope. Use: Operational, Regulatory, Financial, Fraud");

            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository.GenerateReportAsync(dto, userId.Value, userOrgId);

            return CreatedAtAction(nameof(GetReportById),
                new { id = response.ReportID }, response);
        }

        [HttpGet("kpis")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllKPIs()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository.GetAllKPIsAsync(userOrgId);
            return Ok(response);
        }

        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateKPI(int id, [FromBody] UpdateKPIDto dto)
        {
            // ── Verify KPI exists before updating ──                             // ← SaaS FIX
            // Note: UpdateKPIAsync doesn't accept orgId, so we rely on            // ← SaaS FIX
            // GetAllKPIsAsync to verify KPI is within org scope                   // ← SaaS FIX
            var userOrgId = GetLoggedInUserOrgId();                                // ← SaaS FIX
            var allKPIs = await _reportRepository.GetAllKPIsAsync(userOrgId);      // ← SaaS FIX
            var kpiExists = allKPIs.Any(k => k.KPIID == id);                      // ← SaaS FIX
            if (!kpiExists)                                                        // ← SaaS FIX
                return NotFound($"KPI {id} not found.");                          // ← SaaS FIX

            var response = await _reportRepository.UpdateKPIAsync(id, dto);

            if (response == null)
                return NotFound($"KPI {id} not found.");

            return Ok(response);
        }

        [HttpGet("audit-packages")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllAuditPackages()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository.GetAllAuditPackagesAsync(userOrgId);
            return Ok(response);
        }

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
                return BadRequest("PeriodStart must be before PeriodEnd.");

            var userOrgId = GetLoggedInUserOrgId();
            var response = await _reportRepository
                .GenerateAuditPackageAsync(periodStart, periodEnd, userId.Value, userOrgId);

            return CreatedAtAction(nameof(GetAllAuditPackages),
                new { id = response.PackageID }, response);
        }
    }
}