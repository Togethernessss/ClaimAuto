using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("AuditPackages")]
    public class AuditPackage
    {
        [Key]
        public int PackageID { get; set; }

        [Required]
        public DateTime PeriodStart { get; set; }

        [Required]
        public DateTime PeriodEnd { get; set; }

        public string? ContentsJSON { get; set; }

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // ── PDF stored on generation ──────────────────────────────
        public byte[]? PackageFilePDF { get; set; }

        // ── Who generated this package ────────────────────────────
        public int? GeneratedByID { get; set; }
        [ForeignKey("GeneratedByID")]
        public User? GeneratedByUser { get; set; }

        // ── Multi-Tenant (Phase 2) ────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}