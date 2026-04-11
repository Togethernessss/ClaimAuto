using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff access reports
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service)
        {
            _service = service;
        }

        // ── Reports ─────────────────────────────────────

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Report>>> GetAllReports()
        {
            var reports = await _service.GetAllAsync();
            return Ok(reports);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Report>> GetReport(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Report);
        }

        [HttpGet("scope/{scope}")]
        public async Task<ActionResult<IEnumerable<Report>>> GetReportsByScope(ReportScope scope)
        {
            var reports = await _service.GetByScopeAsync(scope);
            return Ok(reports);
        }

        [HttpPost]
        public async Task<ActionResult<Report>> GenerateReport(Report report)
        {
            var created = await _service.CreateAsync(report);
            return CreatedAtAction(nameof(GetReport), new { id = created.ReportID }, created);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var result = await _service.DeleteReportAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // ── Dashboard ───────────────────────────────────

        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            var dashboard = await _service.GetDashboardAsync();
            return Ok(dashboard);
        }

        // ── KPIs ────────────────────────────────────────

        [HttpGet("kpis")]
        public async Task<ActionResult<IEnumerable<KPI>>> GetAllKPIs()
        {
            var kpis = await _service.GetAllKPIsAsync();
            return Ok(kpis);
        }

        [HttpGet("kpis/{id}")]
        public async Task<ActionResult<KPI>> GetKPI(int id)
        {
            var result = await _service.GetKPIByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Kpi);
        }

        [HttpPost("kpis")]
        public async Task<ActionResult<KPI>> CreateKPI(KPI kpi)
        {
            var created = await _service.CreateKPIAsync(kpi);
            return CreatedAtAction(nameof(GetKPI), new { id = created.KPIID }, created);
        }

        [HttpPut("kpis/{id}")]
        public async Task<IActionResult> UpdateKPI(int id, KPI updated)
        {
            var result = await _service.UpdateKPIAsync(id, updated);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        [HttpDelete("kpis/{id}")]
        public async Task<IActionResult> DeleteKPI(int id)
        {
            var result = await _service.DeleteKPIAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // ── Audit Packages ──────────────────────────────

        [HttpGet("audit-packages")]
        public async Task<ActionResult<IEnumerable<AuditPackage>>> GetAllAuditPackages()
        {
            var packages = await _service.GetAllAuditPackagesAsync();
            return Ok(packages);
        }

        [HttpGet("audit-packages/{id}")]
        public async Task<ActionResult<AuditPackage>> GetAuditPackage(int id)
        {
            var result = await _service.GetAuditPackageByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Package);
        }

        [HttpPost("audit-packages")]
        public async Task<ActionResult<AuditPackage>> CreateAuditPackage(AuditPackage package)
        {
            var created = await _service.CreateAuditPackageAsync(package);
            return CreatedAtAction(nameof(GetAuditPackage), new { id = created.PackageID }, created);
        }

        [HttpDelete("audit-packages/{id}")]
        public async Task<IActionResult> DeleteAuditPackage(int id)
        {
            var result = await _service.DeleteAuditPackageAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}

