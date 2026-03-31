using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimStatusHistory
    {
        public int Id { get; set; } 
        public int ClaimId { get; set; }
        [ForeignKey("Claim")]
        public Claim Claim { get; set; }
        public string OldStatus {  get; set; }
        public string NewStatus { get; set; }
        public int ChangedBy { get; set; }
        public string Remarks { get; set; }
        public DateTime ChangedAt { get; set; }
    }
}
