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

        // ─── Password login lockout (OWASP A07) ──────────────────────────
        // Increments on every failed password attempt. Resets on success.
        // When >= MAX_LOGIN_ATTEMPTS, LoginLockoutEnd is set N minutes ahead
        // and the user is rejected until that time passes.
        public int LoginFailedAttempts { get; set; } = 0;

        public DateTime? LoginLockoutEnd { get; set; }

        [Required]
        public AccountStatus Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        // ─── Multi-Tenant: which insurance company this user belongs to ─────
        // Nullable to keep migration safe — existing users get backfilled by
        // the seed script. Going forward, registration sets this required.
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
        public bool IsInNetwork { get; set; } = true;

        // ─── Profile photo — base64 data URL ("data:image/png;base64,…") ─
        // Nullable, max ~3 MB on the wire (2 MB binary). Stored as nvarchar(MAX).
        public string? ProfilePhoto { get; set; }

        // Navigation
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>(); // 1-to-many with AuditLog
    
    }
}
