using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Policies")]
    public class Policy
    {
        [Key]
        public int PolicyID { get; set; }

        [Required, MaxLength(50)]
        public string PlanCode { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string PlanName { get; set; } = string.Empty;

        public string? CoverageRulesJSON { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal? DeductibleAmount { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        [Required]
        public PolicyStatus Status { get; set; } = PolicyStatus.Active;

        // Navigation
        public ICollection<Member> Members { get; set; } = new List<Member>();
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
        public ICollection<EligibilityCheck> EligibilityChecks { get; set; } = new List<EligibilityCheck>();

        // Tracks when advance expiry notifications were sent
        // Null = notification not sent yet
        // Tracks when advance expiry notifications were sent
        // Null = notification not sent yet
        public DateTime? NotifiedAt7Days { get; set; }
        public DateTime? NotifiedAt2Hours { get; set; }

        // ─── Multi-Tenant (Phase 1) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal? SumInsured { get; set; }   // ← Total coverage limit per policy period
    }
}

