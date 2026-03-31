using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Doctor
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }

        [Required, MaxLength(50)]
        public string Specialization { get; set; }

        [Required, MaxLength(50)]
        public string RegistrationNo { get; set; }

        public bool IsAvailable { get; set; } = true;

        // FK to Hospital
        public int HospitalId { get; set; }
        public Hospital Hospital { get; set; }

        // Child entities
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
