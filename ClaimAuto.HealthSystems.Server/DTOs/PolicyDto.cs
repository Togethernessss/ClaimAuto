namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // PolicyID is auto-generated
    // Members navigation property not needed
    public class PolicyDto
    {
        public string? PlanCode { get; set; }
        // Example: "FAMILY-GOLD-2024"

        public string PlanName { get; set; } = string.Empty;
        // Example: "Family Gold Health Plan"

        public decimal? DeductibleAmount { get; set; }
        // Example: 5000.00

        public decimal? OutOfPocketMax { get; set; }
        // Example: 100000.00

        public DateTime EffectiveFrom { get; set; }
        // Example: "2024-01-01"

        public DateTime? EffectiveTo { get; set; }
        // Example: "2025-12-31" — leave null for auto-renew

        // Status options: "Active" / "Expired" / "Suspended"
        public string Status { get; set; } = "Active";
    }
}