using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("FraudScores")]
    public class FraudScore
    {
        [Key]
        public int ScoreID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        // Navigation
        public Claim Claim { get; set; } = null!;

        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }


        [MaxLength(100)]
        public string? ScoringModel { get; set; }

        [Required, Column(TypeName = "decimal(5,2)")]
        public decimal ScoreValue { get; set; }

        public string? FactorsJSON { get; set; }

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}