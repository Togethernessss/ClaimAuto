using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Doctor
    {
        public int Id { get; set; }

        [Required]
        public int HospitalId { get; set; }

        public Hospital Hospital { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Specialization { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string RegistrationNo { get; set; } = string.Empty;

        public bool IsAvailable { get; set; } = true;

        // Optional 1‑to‑many: Doctor → Claims
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
