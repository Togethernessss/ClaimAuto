using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Doctor
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Specialization { get; set; }
        public string RegistrationNo { get; set; }
        public bool IsAvailable { get; set; }
        //Foreign key
        public int HospitalId { get; set; }
        public ApplicationUser Hospital { get; set; }   


    }
}
