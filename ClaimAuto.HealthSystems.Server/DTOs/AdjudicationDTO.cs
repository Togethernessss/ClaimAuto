namespace ClaimAuto.HealthSystems.Server.DTOs
{

    // ── AutoAdjudicateDto 
    public class AutoAdjudicateDto
    {
        public int ClaimID { get; set; }
    }

    // ── ManualAdjudicateDto
    public class ManualAdjudicateDto
    {
        public int ClaimID { get; set; }
        public string Decision { get; set; } = string.Empty;     // "Approved","Denied","Partial"
        public decimal? PayableAmount { get; set; }              // staff-entered after deductible
        public string? CalculationsJSON { get; set; }            // the math breakdown
        public string? Notes { get; set; }                       // Sneha's reason/comment
    }

    // ── AdjudicationResponseDto 
    public class AdjudicationResponseDto
    {
        public int AdjID { get; set; }
        public int ClaimID { get; set; }
        public DateTime ExecutedAt { get; set; }
        public string? EngineVersion { get; set; }
        public string Decision { get; set; } = string.Empty;
        public string? CalculationsJSON { get; set; }
        public string? AppliedRulesJSON { get; set; }
        public string? Notes { get; set; }
        public string PerformedByName { get; set; } = string.Empty; // "System (Auto)" or staff name
    }

    // ── RuleTraceDto 
    public class RuleTraceDto
    {
        public int RuleID { get; set; }
        public string RuleName { get; set; } = string.Empty;
        public string RuleType { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty;       // "PASS" or "FAIL"
        public string Reason { get; set; } = string.Empty;       // human-readable explanation
    }
}
