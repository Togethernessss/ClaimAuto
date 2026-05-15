using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;// for [Table], [Column], etc.

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; }

        [Required, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public bool MustChangePassword { get; set; } = false;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(100)]
        public string? Department { get; set; }

        public bool MFAEnabled { get; set; } = false;

        [MaxLength(128)]
        public string? MFASecretKey { get; set; }         

        public DateTime? MFACodeExpiry { get; set; }      

        public int MFAFailedAttempts { get; set; } = 0;   


        [Required]
        public AccountStatus Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>(); // 1-to-many with AuditLog
    }
}
