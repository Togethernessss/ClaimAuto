using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class SystemConfig
    {
        [Key]
        public int Id { get; set; }

        // The config key name
        // e.g., "AutoApprovalAmountLimit", "DuplicateDetectionWindowDays"
        [Required]
        [MaxLength(100)]
        public string ConfigKey { get; set; }

        // The config value (stored as string, parsed in code)
        // e.g., "50000", "7"
        [Required]
        [MaxLength(500)]
        public string ConfigValue { get; set; }

        // FK → User.Id (which admin last updated this config)
        public int? UpdatedBy { get; set; }

        [ForeignKey("UpdatedBy")]
        public User UpdatedByUser { get; set; }

        // When this config was last changed
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }


    // Change log to track who changed what and when
    public class ConfigChangeLog
    {
        [Key]
        public int Id { get; set; }

        // FK → SystemConfig.Id
        [Required]
        public int SystemConfigId { get; set; }

        [ForeignKey("SystemConfigId")]
        public SystemConfig SystemConfig { get; set; }

        // What was changed
        [Required]
        [MaxLength(100)]
        public string ConfigKey { get; set; }

        [MaxLength(500)]
        public string OldValue { get; set; }

        [Required]
        [MaxLength(500)]
        public string NewValue { get; set; }

        // FK → User.Id (who made this change)
        [Required]
        public int ChangedBy { get; set; }

        [ForeignKey("ChangedBy")]
        public User ChangedByUser { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}
