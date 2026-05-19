using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;// for [Table], [Column], etc.

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Subrogations")]
    public class Subrogation
    {
        [Key]
        public int SubroID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }

        // Navigation
        public Claim Claim { get; set; } = null!;

        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal? RecoverableAmount { get; set; }

        public string? ThirdPartyDetailsJSON { get; set; }

        [Required]
        public DateTime InitiatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public SubrogationStatus Status { get; set; } = SubrogationStatus.Initiated;

        [Column(TypeName = "decimal(12,2)")]
        public decimal? RecoveryAmount { get; set; }

        public DateTime? RecoveredAt { get; set; }
    }
}