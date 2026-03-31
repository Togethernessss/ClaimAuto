using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Dependent
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        public string Relation { get; set; }
        public DateTime DateOfBirth { get; set; }
        public bool IsCovered { get; set; }
        //Foreign key
        public int PatientId { get; set; }
        public ApplicationUser Patient { get; set; }    
    }
}
