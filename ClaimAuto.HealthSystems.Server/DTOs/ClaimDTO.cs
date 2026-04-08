namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateClaimDto
    {
        public int MemberID { get; set; }
        public int PolicyID { get; set; }
        public string ClaimType { get; set; } = string.Empty;
        public decimal TotalBilledAmount { get; set; }
        public string Currency { get; set; } = "INR";
        public string SourceChannel { get; set; } = string.Empty;
        public string? ExternalClaimRef { get; set; }
    }

    public class ClaimResponseDto
    {
        public int ClaimID { get; set; }
        public string? ExternalClaimRef { get; set; }
        public int ProviderID { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public int MemberID { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string ClaimType { get; set; } = string.Empty;
        public decimal TotalBilledAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
    }
}
