namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // AdjID, ExecutedAt are auto-generated
    // Claim navigation not needed — just ClaimID
    public class AdjudicationDto
    {
        public int ClaimID { get; set; }
        // The ClaimID to adjudicate

        public string? EngineVersion { get; set; }
        // Example: "v2.3.1"

        // Decision options: "Paid" / "Denied" / "Partial" / "PendingReview"
        public string Decision { get; set; } = string.Empty;

        public string? CalculationsJSON { get; set; }
        // Example: "{\"billed\":30000,\"deductible\":5000,\"approved\":25000}"

        public string? AppliedRulesJSON { get; set; }
        // Example: "[\"R001:PASS\",\"R002:PASS\",\"R003:PASS\"]"

        public string? Notes { get; set; }
        // Example: "All checks passed. Deductible applied."

        public int? PerformedByID { get; set; }
        // Leave NULL for auto-adjudication
        // Send InsuranceStaff UserID for manual adjudication
    }
}