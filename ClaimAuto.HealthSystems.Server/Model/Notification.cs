using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Notifications")]
    public class Notification
    {
        [Key]
        public int NotificationID { get; set; }

        [ForeignKey("User")]
        public int UserID { get; set; }
        public User User { get; set; } = null!;

        public int? ClaimID { get; set; }

        [ForeignKey("ClaimID")]
        public Claim? Claim { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public NotificationCategory Category { get; set; }

        [Required]
        public NotificationSeverity Severity { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        [Required]
        public NotificationStatus Status { get; set; } = NotificationStatus.Unread;

        // ─── Multi-Tenant (Phase 4) ────────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
