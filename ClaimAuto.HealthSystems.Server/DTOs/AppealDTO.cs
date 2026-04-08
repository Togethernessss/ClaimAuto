namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateAppealDto
    public class CreateAppealDto
    {
        public int ClaimID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentsJSON { get; set; }               // optional extra documents
    }

    // ── DecideAppealDto 
    public class DecideAppealDto
    {
        public string Outcome { get; set; } = string.Empty;     // "Upheld","Overturned","PartiallyUpheld"
    }

    // ── AppealResponseDto
    public class AppealResponseDto
    {
        public int AppealID { get; set; }
        public int ClaimID { get; set; }
        public string FiledByName { get; set; } = string.Empty;  // resolved — "Arjun Sharma"
        public DateTime FiledAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentsJSON { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DecisionAt { get; set; }
        public string? DecisionByName { get; set; }              // resolved — "Sneha Kapoor"
        public string? Outcome { get; set; }                     // null until decided
    }

    // ── CreateSubrogationDto
    public class CreateSubrogationDto
    {
        public int ClaimID { get; set; }
        public decimal? RecoverableAmount { get; set; }
        public string? ThirdPartyDetailsJSON { get; set; }
    }
}
