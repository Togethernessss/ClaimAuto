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

        // ─── Template key — must match a registered IRuleStrategy.TemplateKey ─
        // Storing as a string lets the engine dispatch to the correct strategy
        // and lets admins create new rule instances without DB schema changes.
        // Values come from Model/RuleTemplate constants (e.g., "PolicyActive",
        // "AmountAbove", "DuplicateCheck"). Legacy enum names (Coverage / Payment
        // / Validation) are still accepted by the DB column for backward compat.
        [Required, MaxLength(60)]
        public string RuleType { get; set; } = string.Empty;

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

        // ─── Multi-Tenant (Phase 4 finalization) ─────────────────────────
        // Rules are per-organization. Each insurer defines its own adjudication policies.
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}