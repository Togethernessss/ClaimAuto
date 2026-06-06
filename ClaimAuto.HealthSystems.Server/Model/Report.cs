using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Reports")]
    public class Report
    {
        [Key]
        public int ReportID { get; set; }

        [Required]
        public ReportScope Scope { get; set; }

        public string? ParametersJSON { get; set; }

        public string? MetricsJSON { get; set; }

        [ForeignKey("GeneratedByUser")]
        public int GeneratedBy { get; set; }
        public User GeneratedByUser { get; set; } = null!;

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // ── PDF stored on generation ──────────────────────────────
        public byte[]? ReportFilePDF { get; set; }

        // ── Multi-Tenant (Phase 2) ────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}