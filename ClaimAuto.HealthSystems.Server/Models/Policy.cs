using System.ComponentModel.DataAnnotations;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Policy
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string PolicyNumber { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string PolicyType { get; set; } = string.Empty; // Individual, Family Floater, Senior

        public decimal Premium { get; set; }

        public decimal SumInsured { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public bool IsRenewed { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Active"; // Active, Expired, Cancelled

        [Required]
        public int CreatedBy { get; set; } // FK to User (Admin/Staff)

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 1‑to‑many: Patient → Policy
        public int PatientId { get; set; }

        public Patient Patient { get; set; } = null!;

        // 1‑to‑many: Policy → Claims
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
