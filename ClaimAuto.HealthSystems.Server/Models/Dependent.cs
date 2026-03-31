using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Dependent
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required, MaxLength(30)]
        public string Relation { get; set; } // "Spouse", "Child", "Parent"

        public DateTime DateOfBirth { get; set; }

        public bool IsCovered { get; set; } = true;

        // FK to Patient
        public int PatientId { get; set; }
        public Patient Patient { get; set; }
    }
}
