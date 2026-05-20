using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Appeals")]
    public class Appeal
    {
        [Key]
        public int AppealID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        public Claim Claim { get; set; } = null!;

        [ForeignKey("FiledByUser")]
        public int FiledBy { get; set; }
        public User FiledByUser { get; set; } = null!;

        [Required]
        public DateTime FiledAt { get; set; } = DateTime.UtcNow;

        [Required]
        public string Reason { get; set; } = string.Empty;

        public string? DocumentsJSON { get; set; }

        public byte[]? AppealFilePDF { get; set; }
        [Required]
        public AppealStatus Status { get; set; } = AppealStatus.Filed;

        public DateTime? DecisionAt { get; set; }

        public int? DecisionByID { get; set; }
        [ForeignKey("DecisionByID")]
        public User? DecisionBy { get; set; }

        public AppealOutcome? Outcome { get; set; }

        // ─── Multi-Tenant (Phase 1) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
