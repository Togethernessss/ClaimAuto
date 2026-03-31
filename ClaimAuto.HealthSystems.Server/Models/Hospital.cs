using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Hospital
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }

        [Required, MaxLength(20)]
        public string Code { get; set; }

        [Required, MaxLength(200)]
        public string Address { get; set; }

        public bool IsInNetwork { get; set; }

        [MaxLength(100)]
        public string Contact { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Child entities
        public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
