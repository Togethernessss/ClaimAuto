using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class ReportsController : ControllerBase
    {
        // GET /api/reports
        // Returns all reports. Filter by Scope.
        [HttpGet]
        public async Task<IActionResult> GetAllReports(
            [FromQuery] string? scope)
        { }

        // GET /api/reports/{id}
        // Returns single report.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportById(int id) { }

        // POST /api/reports
        // Generates a new report. GeneratedBy from JWT token.
        [HttpPost]
        public async Task<IActionResult> GenerateReport(
            [FromBody] GenerateReportDto dto)
        { }

        // NOTE: No DELETE — reports are immutable for compliance.
        // A regulator might request a report that was previously generated.
        // Deleting it would be a compliance violation.

        // ── KPI sub-routes ────────────────────────────────────────

        // GET /api/reports/kpis
        // Returns all KPIs — live dashboard data.
        [HttpGet("kpis")]
        public async Task<IActionResult> GetAllKPIs() { }

        // PUT /api/reports/kpis/{id}
        // Admin updates KPI target or current value.
        [HttpPut("kpis/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateKPI(int id,
            [FromBody] UpdateKPIDto dto)
        { }

        // ── Audit Package sub-routes ──────────────────────────────

        // GET /api/reports/audit-packages
        // Returns all audit packages.
        [HttpGet("audit-packages")]
        public async Task<IActionResult> GetAllAuditPackages() { }

        // POST /api/reports/audit-packages
        // Admin generates a new audit package for a period.
        // Bundles AuditLogs + AdjudicationRecords + Reports into ZIP.
        [HttpPost("audit-packages")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GenerateAuditPackage(
            [FromQuery] DateTime periodStart,
            [FromQuery] DateTime periodEnd)
        { }
    }
}
