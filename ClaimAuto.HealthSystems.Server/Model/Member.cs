using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
//Member -person covered by an insurance policy
namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Members")]//maps to members table
    public class Member
    {
        [Key]
        public int MemberID { get; set; }//identity column

        [ForeignKey("Policy")]
        public int PolicyID { get; set; }
        public Policy Policy { get; set; } = null!;//Every member must have a policy

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime DOB { get; set; }

        [Required]
        public GenderType Gender { get; set; }

        [MaxLength(50)]
        public string? MemberNumber { get; set; }//has unique constraint having memberid

        public string? ContactInfoJSON { get; set; }

        [Required]
        public DateTime CoverageStart { get; set; }

        public DateTime? CoverageEnd { get; set; }

        [Required]
        public MemberStatus Status { get; set; } = MemberStatus.Active;//enums(Active,Inactive,Suspended)

        // Navigation
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();//a member can have many claims
        public ICollection<EligibilityCheck> EligibilityChecks { get; set; } = new List<EligibilityCheck>();//ttl caching tbale
    }
}
