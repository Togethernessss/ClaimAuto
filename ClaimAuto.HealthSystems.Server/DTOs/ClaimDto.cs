namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ClaimID, SubmittedAt, ReceivedAt, Status are auto-set
    // Navigation properties (Provider, Member, Policy) not needed
    public class ClaimDto
    {
        public string? ExternalClaimRef { get; set; }
        // Example: "SRH-2025-0301" — hospital's own reference number

        public int ProviderID { get; set; }
        // UserID of the Hospital user (Rahul)

        public int MemberID { get; set; }
        // MemberID of the patient (Arjun)

        public int PolicyID { get; set; }
        // PolicyID of the insurance plan

        // ClaimType options: "Inpatient" / "Outpatient" / "Pharmacy"
        public string ClaimType { get; set; } = string.Empty;

        public decimal TotalBilledAmount { get; set; }
        // Example: 30000.00

        public string Currency { get; set; } = "INR";

        // Priority options: "Normal" / "High" / "Urgent"
        public string Priority { get; set; } = "Normal";

        // SourceChannel options: "Portal" / "EDI" / "API" / "BatchCSV"
        public string SourceChannel { get; set; } = "Portal";
    }
}