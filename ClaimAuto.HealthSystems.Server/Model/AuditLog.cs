using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;// for [Table], [Column], etc.

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("AuditLogs")]
    public class AuditLog
    {
        [Key]
        public int AuditID { get; set; }

        [ForeignKey("User")]
        public int UserID { get; set; }
        public User User { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ResourceType { get; set; }

        [MaxLength(100)]
        public string? ResourceID { get; set; }

        // Stored as JSON string
        public string? DetailsJSON { get; set; }

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;


        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
