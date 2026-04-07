using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Claims")]
    public class Claim
    {
        [Key]
        public int ClaimID { get; set; }

        [MaxLength(100)]
        public string? ExternalClaimRef { get; set; }

        [ForeignKey("Provider")]
        public int ProviderID { get; set; }
        public User Provider { get; set; } = null!;

        [ForeignKey("Member")]
        public int MemberID { get; set; }
        public Member Member { get; set; } = null!;

        [ForeignKey("Policy")]
        public int PolicyID { get; set; }
        public Policy Policy { get; set; } = null!;

        [Required]
        public ClaimType ClaimType { get; set; }

        [Required]
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReceivedAt { get; set; }

        [Required, Column(TypeName = "decimal(12,2)")]
        public decimal TotalBilledAmount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "INR";

        [Required]
        public ClaimStatus Status { get; set; } = ClaimStatus.Submitted;

        [Required]
        public ClaimPriority Priority { get; set; } = ClaimPriority.Normal;

        [Required]
        public SourceChannel SourceChannel { get; set; }

        // Navigation
        public ICollection<ClaimLine> ClaimLines { get; set; } = new List<ClaimLine>();
        public ICollection<ClaimDocument> ClaimDocuments { get; set; } = new List<ClaimDocument>();
        public ICollection<AdjudicationRecord> AdjudicationRecords { get; set; } = new List<AdjudicationRecord>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<FraudScore> FraudScores { get; set; } = new List<FraudScore>();
        public ICollection<FraudCase> FraudCases { get; set; } = new List<FraudCase>();
        public ICollection<Appeal> Appeals { get; set; } = new List<Appeal>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<Tasks> Tasks { get; set; } = new List<Tasks>();
    }
}