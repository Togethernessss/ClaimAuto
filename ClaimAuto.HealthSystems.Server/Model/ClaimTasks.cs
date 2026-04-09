using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Tasks")]
    public class ClaimTasks
    {
        [Key]
        public int TaskID { get; set; }

        [ForeignKey("AssignedToUser")]
        public int AssignedTo { get; set; }
        public User AssignedToUser { get; set; } = null!;

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        public Claim Claim { get; set; } = null!;

        [Required]
        public string Description { get; set; } = string.Empty;

        public DateTime? DueDate { get; set; }

        [Required]
        public TaskPriority Priority { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        [Required]
        public TaskStatus Status { get; set; } = TaskStatus.Pending;
    }
}