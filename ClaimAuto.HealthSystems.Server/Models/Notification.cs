using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        // FK → User.Id (who receives this notification)
        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; }

        // FK → Claim.Id (which claim this notification is about)
        [Required]
        public int ClaimId { get; set; }

        [ForeignKey("ClaimId")]
        public Claim Claim { get; set; }

        // The notification message shown in the bell dropdown
        // e.g., "Claim #1 status changed to Auto-Approved"
        [Required]
        [MaxLength(500)]
        public string Message { get; set; }

        // Has the user seen/clicked this notification?
        public bool IsRead { get; set; } = false;

        // When this notification was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
