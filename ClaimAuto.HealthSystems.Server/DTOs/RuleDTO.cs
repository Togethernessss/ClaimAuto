namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateRuleDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string RuleType { get; set; } = string.Empty;  // "Coverage", "Payment", "Validation"
        public string ConditionExpressionJSON { get; set; } = string.Empty;
        public string ActionExpressionJSON { get; set; } = string.Empty;
        public int Priority { get; set; }
    }

    public class UpdateRuleDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string RuleType { get; set; } = string.Empty;
        public string ConditionExpressionJSON { get; set; } = string.Empty;
        public string ActionExpressionJSON { get; set; } = string.Empty;
        public int Priority { get; set; }
    }

    public class RuleResponseDto
    {
        public int RuleID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string RuleType { get; set; } = string.Empty;
        public string ConditionExpressionJSON { get; set; } = string.Empty;
        public string ActionExpressionJSON { get; set; } = string.Empty;
        public int Priority { get; set; }
        public int Version { get; set; }
        public string Status { get; set; } = string.Empty;
        public int CreatedBy { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
