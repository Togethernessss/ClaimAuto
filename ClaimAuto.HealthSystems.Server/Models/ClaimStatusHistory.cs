using System.ComponentModel.DataAnnotations;
using ClaimAuto.HealthSystems.Server.Models;

namespace ClaimAuto.HealthSystem.Server.Models
{
    public class ClaimStatusHistory
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }
        public Claim Claim { get; set; }

        [Required, MaxLength(50)]
        public string OldStatus { get; set; }

        [Required, MaxLength(50)]
        public string NewStatus { get; set; }

        public string Remarks { get; set; }

        public string ChangedByUserId { get; set; }
        public ApplicationUser ChangedByUser { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}