using Microsoft.AspNetCore.Identity;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string MiddleName { get; set; }
        public string FullName => $"{FirstName} {MiddleName} {LastName}".Trim();
        public DateTime? DateOfBirth { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string Country { get; set; }
        public string AadhaarOrID { get; set; }
        public string Status { get; set; } = "Active"; // "Active", "Inactive"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties (for other entities to refer to this user)
        public ICollection<Patient> Patients { get; set; } = new List<Patient>();
        public ICollection<Claim> ClaimsCreatedBy { get; set; } = new List<Claim>();
        public ICollection<ClaimStatusHistory> ClaimStatusHistories { get; set; } = new List<ClaimStatusHistory>();
        public ICollection<ClaimPayment> ClaimPayments { get; set; } = new List<ClaimPayment>();
    }
}
