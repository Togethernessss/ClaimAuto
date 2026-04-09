namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateRuleDto 
    public class CreateRuleDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string RuleType { get; set; } = string.Empty;     // "Coverage","Payment","Validation"
        public string ConditionExpressionJSON { get; set; } = string.Empty;
        public string ActionExpressionJSON { get; set; } = string.Empty;
        public int Priority { get; set; }
    }

    // ── UpdateRuleDto 
    public class UpdateRuleDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? ConditionExpressionJSON { get; set; }
        public string? ActionExpressionJSON { get; set; }
        public int? Priority { get; set; }
    }

    // ── RuleResponseDto 
    public class RuleResponseDto
    {
        public int RuleID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string RuleType { get; set; } = string.Empty;
        public string ConditionExpressionJSON { get; set; } = string.Empty;
        public string ActionExpressionJSON { get; set; } = string.Empty;
        public int Priority { get; set; }
        public int Version { get; set; }                         // audit visibility
        public string CreatedByName { get; set; } = string.Empty; // resolved
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;      // "Active","Inactive","Draft"
    }
}
