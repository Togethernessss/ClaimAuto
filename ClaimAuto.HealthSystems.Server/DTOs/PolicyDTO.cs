namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreatePolicyDto
    public class CreatePolicyDto
    {
        public string PlanCode { get; set; } = string.Empty;     // e.g. "FAMILY-GOLD-2024"
        public string PlanName { get; set; } = string.Empty;
        public string? CoverageRulesJSON { get; set; }
        public decimal? SumInsured { get; set; }                 // total insurer payout limit per year
        public decimal? DeductibleAmount { get; set; }
        public DateTime EffectiveFrom { get; set; }              // set once — never changed
        public DateTime? EffectiveTo { get; set; }
    }

    // ── UpdatePolicyDto
    public class UpdatePolicyDto
    {
        public string? PlanName { get; set; }
        public string? CoverageRulesJSON { get; set; }
        public decimal? SumInsured { get; set; }                 // total insurer payout limit per year
        public decimal? DeductibleAmount { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string? Status { get; set; }    // "Active","Expired","Suspended"
    }

    // ── PolicyResponseDto
    public class PolicyResponseDto
    {
        public int PolicyID { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public string? CoverageRulesJSON { get; set; }
        public decimal? SumInsured { get; set; }                 // total insurer payout limit per year
        public decimal? DeductibleAmount { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public int MemberCount { get; set; }                     // computed — not in DB model
    }
}
