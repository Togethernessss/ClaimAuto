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

        public Patient Patient { get; set; } = null!;

        [Required]
        public int PolicyId { get; set; }

        public Policy Policy { get; set; } = null!;

        [Required]
        public int HospitalId { get; set; }

        public Hospital Hospital { get; set; } = null!;

        public int? DoctorId { get; set; }

        public Doctor? Doctor { get; set; }

        [Required, MaxLength(20)]
        public string ClaimType { get; set; } = "Cashless"; // Cashless, Reimbursement

        [Required]
        public DateTime DateOfService { get; set; }

        public decimal TotalAmount { get; set; }

        public decimal ClaimedAmount { get; set; }

        [MaxLength(20)]
        public string? DiagnosisCode { get; set; }

        public string Description { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string Status { get; set; } = "Submitted"; // Submitted, AutoApproved, PendingReview, Approved, Rejected

        [Required]
        public int CreatedBy { get; set; } // FK to User who created claim

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // 1‑to‑many: Claim → Documents
        public ICollection<ClaimDocument> Documents { get; set; } = new List<ClaimDocument>();

        // 1‑to‑many: Claim → StatusHistory
        public ICollection<ClaimStatusHistory> StatusHistory { get; set; } = new List<ClaimStatusHistory>();

        // 1‑to‑one: Claim → Payment (optional)
        public ClaimPayment? Payment { get; set; }
    }
}
