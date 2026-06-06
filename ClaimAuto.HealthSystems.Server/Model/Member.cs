using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Members")]
    public class Member
    {
        [Key]
        public int MemberID { get; set; }

        [ForeignKey("Policy")]
        public int PolicyID { get; set; }
        public Policy Policy { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime DOB { get; set; }

        [Required]
        public GenderType Gender { get; set; }

        [MaxLength(50)]
        public string? MemberNumber { get; set; }

        public string? ContactInfoJSON { get; set; }

        [Required]
        public DateTime CoverageStart { get; set; }

        public DateTime? CoverageEnd { get; set; }

        [Required]
        public MemberStatus Status { get; set; } = MemberStatus.Active;

        // Which Policyholder user owns this member
        // Nullable — Admin/Staff enrolled members may not have a linked policyholder
        // Which Policyholder user owns this member
        // Nullable — Admin/Staff enrolled members may not have a linked policyholder
        public int? PolicyholderUserID { get; set; }

        [ForeignKey("PolicyholderUserID")]
        public User? PolicyholderUser { get; set; }

        // ─── Multi-Tenant (Phase 1) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        // Navigation
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
        public ICollection<EligibilityCheck> EligibilityChecks { get; set; } = new List<EligibilityCheck>();
    }
}
