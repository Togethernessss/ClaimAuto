using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Claim
    {
        public int Id { get; set; }

        [Required]
        public int PatientId { get; set; }
        public Patient Patient { get; set; }

        [Required]
        public int PolicyId { get; set; }
        public Policy Policy { get; set; }

        [Required]
        public int HospitalId { get; set; }
        public Hospital Hospital { get; set; }

        public int? DoctorId { get; set; }
        public Doctor Doctor { get; set; }

        [Required, MaxLength(50)]
        public string ClaimType { get; set; } // "Cashless", "Reimbursement"

        public DateTime DateOfService { get; set; }

        public decimal TotalAmount { get; set; }
        public decimal ClaimedAmount { get; set; }

        [MaxLength(20)]
        public string DiagnosisCode { get; set; }

        [MaxLength(500)]
        public string Description { get; set; }

        [Required, MaxLength(50)]
        public string Status { get; set; } // "Submitted", "Auto-Approved", "Pending Review", "Approved", "Rejected"

        // Who created this claim (patient self-service or hospital)
        public string CreatedByUserId { get; set; }
        public ApplicationUser CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Child entities (1–many)
        public ICollection<ClaimDocument> Documents { get; set; } = new List<ClaimDocument>();
        public ICollection<ClaimStatusHistory> StatusHistories { get; set; } = new List<ClaimStatusHistory>();
        public ICollection<ClaimPayment> ClaimPayments { get; set; } = new List<ClaimPayment>();
    }
}
