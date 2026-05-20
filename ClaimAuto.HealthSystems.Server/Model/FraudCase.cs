using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("FraudCases")]
    public class FraudCase
    {
        [Key]
        public int CaseID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        // Navigation
        public Claim Claim { get; set; } = null!;

        

        [Required]
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;

        // ─── Multi-Tenant (Phase 2) 
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        [ForeignKey("OpenedByUser")]
        public int OpenedBy { get; set; }
        public User OpenedByUser { get; set; } = null!;

        [Required]
        public FraudCasePriority Priority { get; set; }

        [Required]
        public FraudCaseStatus Status { get; set; } = FraudCaseStatus.Open;

        public string? InvestigationNotes { get; set; }

        public string? EvidenceURIsJSON { get; set; }

        public DateTime? ResolvedAt { get; set; }

        public FraudOutcome? Outcome { get; set; }
    }
}
