using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimDocument
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }
        public Claim Claim { get; set; }

        [Required, MaxLength(100)]
        public string DocumentName { get; set; }

        [Required, MaxLength(200)]
        public string DocumentPath { get; set; }

        [Required, MaxLength(30)]
        public string DocType { get; set; } // "Bill", "Prescription", "Discharge Summary", "ID Proof"

        public string UploadedByUserId { get; set; }
        public ApplicationUser UploadedByUser { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
