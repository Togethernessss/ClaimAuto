using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimTable
    {
        [Key] public int ClaimId { get; set; }
        public int UserId { get; set; }
        [ForeignKey("UserId")] public UserTable User { get; set; }
        public int ProviderId { get; set; }
        [ForeignKey("PolicyId")] public ProviderTable Provider { get; set; }
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        [Column(TypeName = "decimal(18,2)")] public decimal TotalAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal ApprovedAmount { get; set; }
        public string ClamStatus { get; set; } = "Pending";
        public string Remarks { get; set; }
        public ICollection<ClaimPolicyTable> ClaimItems { get; set; }
    }
}
