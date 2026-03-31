using System.ComponentModel.DataAnnotations;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Policy
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string PolicyNumber { get; set; }

        [Required, MaxLength(50)]
        public string PolicyType { get; set; } // e.g., "Individual", "Family Floater"

        public decimal Premium { get; set; }
        public decimal SumInsured { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsRenewed { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign key
        public string CreatedByUserId { get; set; }
        public ApplicationUser CreatedByUser { get; set; }

        // Child entities
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
