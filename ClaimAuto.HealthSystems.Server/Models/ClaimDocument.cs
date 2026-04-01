using System.ComponentModel.DataAnnotations;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimDocument
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }

        public Claim Claim { get; set; } = null!;

        [Required, MaxLength(100)]
        public string DocumentName { get; set; } = string.Empty;

        [Required]
        public string DocumentPath { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string DocType { get; set; } = "Bill"; // Bill, Prescription, DischargeSummary, IDProof

        [Required]
        public int UploadedBy { get; set; } // FK to User

        public Date
Time UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
