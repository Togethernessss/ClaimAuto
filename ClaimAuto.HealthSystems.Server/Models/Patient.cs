using System.ComponentModel.DataAnnotations;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Patient
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        public User User { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [MaxLength(15)]
        public string Phone { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string AadhaarOrID { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 1‑to‑many: Patient → Policies
        public ICollection<Policy> Policies { get; set; } = new List<Policy>();

        // 1‑to‑many: Patient → Claims
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();

        // 1‑to‑many: Patient → Dependents
        public ICollection<Dependent> Dependents { get; set; } = new List<Dependent>();
    }
}
