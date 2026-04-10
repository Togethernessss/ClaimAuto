namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreatePolicyDto
    {
        public string? PlanCode { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string? CoverageRulesJSON { get; set; }
        public decimal? DeductibleAmount { get; set; }
        public decimal? OutOfPocketMax { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }


    public class UpdatePolicyDto
    {
        public string PlanName { get; set; } = string.Empty;
        public string? CoverageRulesJSON { get; set; }
        public decimal? DeductibleAmount { get; set; }
        public decimal? OutOfPocketMax { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = string.Empty;  // "Active", "Expired", "Suspended"
    }

    public class PolicyResponseDto
    {
        public int PolicyID { get; set; }
        public string? PlanCode { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string? CoverageRulesJSON { get; set; }
        public decimal? DeductibleAmount { get; set; }
        public decimal? OutOfPocketMax { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public int MemberCount { get; set; }
    }

}
