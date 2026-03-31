using System.ComponentModel.DataAnnotations;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Patient
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string AadhaarOrID { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign key to ApplicationUser (who owns this patient)
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        // Child entities
        public ICollection<Dependent> Dependents { get; set; } = new List<Dependent>();
        public ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
