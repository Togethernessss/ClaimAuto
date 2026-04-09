<<<<<<< HEAD
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Data;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ═══════════════════════════════════════════════════
        //  REPORTS  —  /api/reports
        // ═══════════════════════════════════════════════════

        // GET: api/reports
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Report>>> GetAllReports()
        {
            var reports = await _context.Reports
                .Include(r => r.GeneratedByUser)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();

            return Ok(reports);
        }

        // GET: api/reports/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Report>> GetReport(int id)
        {
            var report = await _context.Reports
                .Include(r => r.GeneratedByUser)
                .FirstOrDefaultAsync(r => r.ReportID == id);

            if (report == null)
                return NotFound($"Report with ID {id} not found.");

            return Ok(report);
        }

        // GET: api/reports/scope/Financial
        [HttpGet("scope/{scope}")]
        public async Task<ActionResult<IEnumerable<Report>>> GetReportsByScope(ReportScope scope)
        {
            var reports = await _context.Reports
                .Where(r => r.Scope == scope)
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();

            return Ok(reports);
        }

        // POST: api/reports
        [HttpPost]
        public async Task<ActionResult<Report>> GenerateReport(Report report)
        {
            report.GeneratedAt = DateTime.UtcNow;
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetReport), new { id = report.ReportID }, report);
        }

        // DELETE: api/reports/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var report = await _context.Reports.FindAsync(id);
            if (report == null)
                return NotFound($"Report with ID {id} not found.");

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET: api/reports/dashboard
        // Live KPI computation from real data
        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            var totalClaims = await _context.Claims.CountAsync();
            var approvedClaims = await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Adjudicated);
            var rejectedClaims = await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Rejected);
            var pendingClaims = await _context.Claims.CountAsync(c => c.Status == ClaimStatus.Submitted
                                                                      || c.Status == ClaimStatus.Validated);
            var totalPaid = await _context.Payments
                                    .Where(p => p.Status == PaymentStatus.Executed)
                                    .SumAsync(p => p.Amount);
            var openFraudCases = await _context.FraudCases
                                    .CountAsync(f => f.Status != FraudCaseStatus.Resolved);

            return Ok(new
            {
                TotalClaims = totalClaims,
                ApprovedClaims = approvedClaims,
                RejectedClaims = rejectedClaims,
                PendingClaims = pendingClaims,
                AutoAdjudicRate = totalClaims > 0
                    ? Math.Round((double)approvedClaims / totalClaims * 100, 2)
                    : 0,
                DenialRate = totalClaims > 0
                    ? Math.Round((double)rejectedClaims / totalClaims * 100, 2)
                    : 0,
                TotalAmountPaid = totalPaid,
                OpenFraudCases = openFraudCases
            });
        }

        // ═══════════════════════════════════════════════════
        //  KPIs  —  /api/reports/kpis
        // ═══════════════════════════════════════════════════

        // GET: api/reports/kpis
        [HttpGet("kpis")]
        public async Task<ActionResult<IEnumerable<KPI>>> GetAllKPIs()
        {
            var kpis = await _context.KPIs.ToListAsync();
            return Ok(kpis);
        }

        // GET: api/reports/kpis/5
        [HttpGet("kpis/{id}")]
        public async Task<ActionResult<KPI>> GetKPI(int id)
        {
            var kpi = await _context.KPIs.FindAsync(id);
            if (kpi == null)
                return NotFound($"KPI with ID {id} not found.");

            return Ok(kpi);
        }

        // POST: api/reports/kpis
        [HttpPost("kpis")]
        public async Task<ActionResult<KPI>> CreateKPI(KPI kpi)
        {
            _context.KPIs.Add(kpi);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetKPI), new { id = kpi.KPIID }, kpi);
        }

        // PUT: api/reports/kpis/5
        [HttpPut("kpis/{id}")]
        public async Task<IActionResult> UpdateKPI(int id, KPI updated)
        {
            var kpi = await _context.KPIs.FindAsync(id);
            if (kpi == null)
                return NotFound($"KPI with ID {id} not found.");

            kpi.Name = updated.Name;
            kpi.Definition = updated.Definition;
            kpi.Target = updated.Target;
            kpi.CurrentValue = updated.CurrentValue;
            kpi.ReportingPeriod = updated.ReportingPeriod;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/reports/kpis/5
        [HttpDelete("kpis/{id}")]
        public async Task<IActionResult> DeleteKPI(int id)
        {
            var kpi = await _context.KPIs.FindAsync(id);
            if (kpi == null)
                return NotFound($"KPI with ID {id} not found.");

            _context.KPIs.Remove(kpi);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ═══════════════════════════════════════════════════
        //  AUDIT PACKAGES  —  /api/reports/audit-packages
        // ═══════════════════════════════════════════════════

        // GET: api/reports/audit-packages
        [HttpGet("audit-packages")]
        public async Task<ActionResult<IEnumerable<AuditPackage>>> GetAllAuditPackages()
        {
            var packages = await _context.AuditPackages
                .OrderByDescending(a => a.GeneratedAt)
                .ToListAsync();

            return Ok(packages);
        }

        // GET: api/reports/audit-packages/5
        [HttpGet("audit-packages/{id}")]
        public async Task<ActionResult<AuditPackage>> GetAuditPackage(int id)
        {
            var package = await _context.AuditPackages.FindAsync(id);
            if (package == null)
                return NotFound($"Audit package with ID {id} not found.");

            return Ok(package);
        }

        // POST: api/reports/audit-packages
        [HttpPost("audit-packages")]
        public async Task<ActionResult<AuditPackage>> CreateAuditPackage(AuditPackage package)
        {
            package.GeneratedAt = DateTime.UtcNow;

            _context.AuditPackages.Add(package);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAuditPackage),
                new { id = package.PackageID }, package);
        }

        // DELETE: api/reports/audit-packages/5
        [HttpDelete("audit-packages/{id}")]
        public async Task<IActionResult> DeleteAuditPackage(int id)
        {
            var package = await _context.AuditPackages.FindAsync(id);
            if (package == null)
                return NotFound($"Audit package with ID {id} not found.");

            _context.AuditPackages.Remove(package);
            await _context.SaveChangesAsync();
            return NoContent();
        }
=======
﻿using ClaimAuto.HealthSystems.Server.DTOs;
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
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
    }
}
