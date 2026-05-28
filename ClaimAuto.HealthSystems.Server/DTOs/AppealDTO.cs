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
        public bool HasPDF { get; set; }
    }

    // ── CreateSubrogationDto
    public class CreateSubrogationDto
    {
        public int ClaimID { get; set; }
        public decimal? RecoverableAmount { get; set; }
        public string? ThirdPartyDetailsJSON { get; set; }
    }
    public class FileAppealFormDto
    {
        public int ClaimID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public List<IFormFile>? Files { get; set; }
    }
}