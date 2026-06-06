using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("EligibilityChecks")]
    public class EligibilityCheck
    {
        [Key]
        public int CheckID { get; set; }

        [ForeignKey("Member")]
        public int MemberID { get; set; }
        public Member Member { get; set; } = null!;

        [ForeignKey("Policy")]
        public int PolicyID { get; set; }
        public Policy Policy { get; set; } = null!;

        [Required]
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? Source { get; set; }

        public string? ResultJSON { get; set; }

        public int? TTL { get; set; }

        public int? PerformedByID { get; set; }
        [ForeignKey("PerformedByID")]
        public User? PerformedBy { get; set; }

        

        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
