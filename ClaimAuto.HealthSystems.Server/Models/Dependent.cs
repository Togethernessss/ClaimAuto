using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Dependent
    {
        public int Id { get; set; }

        [Required]
        public int PatientId { get; set; }

        public Patient Patient { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Relation { get; set; } = string.Empty; // Spouse, Child, Parent

        [Required]
        public DateTime DateOfBirth { get; set; }

        public bool IsCovered { get; set; } = true;
    }
}
