using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class UserTable
    {
        [Key] public int UserId { get; set; }
        [Required] public string  FullName { get; set; }
        [Required] public string  Email { get; set; }
        [Required] public string UserRole { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }
}
