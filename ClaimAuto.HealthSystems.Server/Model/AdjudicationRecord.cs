using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("AdjudicationRecords")]
    public class AdjudicationRecord
    {
        [Key]
        public int AdjID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }

        // Navigation
        public Claim Claim { get; set; } = null!;

        //Multi-Tenant (Phase 2)
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        [Required]
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? EngineVersion { get; set; }

        [Required]
        public AdjDecision Decision { get; set; }

        public string? CalculationsJSON { get; set; }

        public string? AppliedRulesJSON { get; set; }

        public string? Notes { get; set; }
        public decimal DeductibleApplied { get; set; } = 0;

        // Null when auto-adjudicated
        public int? PerformedByID { get; set; }
        [ForeignKey("PerformedByID")]
        public User? PerformedBy { get; set; }
    }
}