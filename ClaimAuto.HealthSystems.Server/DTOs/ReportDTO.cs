namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── GenerateReportDto 
    // ── GenerateReportDto
    public class GenerateReportDto
    {
        public string Scope { get; set; } = string.Empty;
        public string? ParametersJSON { get; set; }
    }

    // ── ReportResponseDto
    public class ReportResponseDto
    {
        public int ReportID { get; set; }
        public string Scope { get; set; } = string.Empty;
        public string? ParametersJSON { get; set; }
        public string? MetricsJSON { get; set; }
        public string GeneratedByName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public bool HasPDF { get; set; }  // ← replaces ReportURI
    }

    // ── KPIResponseDto
    public class KPIResponseDto
    {
        public int KPIID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Definition { get; set; }
        public decimal? Target { get; set; }
        public decimal? CurrentValue { get; set; }
        public string? ReportingPeriod { get; set; }
    }

    // ── UpdateKPIDto
    public class UpdateKPIDto
    {
        public decimal? Target { get; set; }
        public decimal? CurrentValue { get; set; }
        public string? ReportingPeriod { get; set; }
    }

    // ── AuditPackageResponseDto
    public class AuditPackageResponseDto
    {
        public int PackageID { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public string? ContentsJSON { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string GeneratedByName { get; set; } = string.Empty;
        public bool HasPDF { get; set; }
    }
}