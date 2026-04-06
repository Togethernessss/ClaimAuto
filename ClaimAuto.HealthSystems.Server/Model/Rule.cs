using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Rules")]
    public class Rule
    {
        [Key]
        public int RuleID { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public RuleType RuleType { get; set; }

        [Required]
        public string ConditionExpressionJSON { get; set; } = string.Empty;

        [Required]
        public string ActionExpressionJSON { get; set; } = string.Empty;

        [Required]
        public int Priority { get; set; }

        public int Version { get; set; } = 1;

        [ForeignKey("CreatedByUser")]
        public int CreatedBy { get; set; }
        public User CreatedByUser { get; set; } = null!;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public RuleStatus Status { get; set; } = RuleStatus.Draft;
    }
}

