using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Hospital
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public bool IsInNetwork { get; set; } = true;

        public string Contact { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 1‑to‑many: Hospital → Doctors
        public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();

        // 1‑to‑many: Hospital → Claims
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
