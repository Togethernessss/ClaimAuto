using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimStatusHistory
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }

        public Claim Claim { get; set; } = null!;

        [Required, MaxLength(30)]
        public string OldStatus { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string NewStatus { get; set; } = string.Empty;

        [Required]
        public int ChangedBy { get; set; } // FK to User

        public string? Remarks { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}
