namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateAppealDto
    {
        public int ClaimID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentsJSON { get; set; }
    }

    public class DecideAppealDto
    {
        public string Outcome { get; set; } = string.Empty;  // "Upheld", "Overturned", "PartiallyUpheld"
    }

    public class AppealResponseDto
    {
        public int AppealID { get; set; }
        public int ClaimID { get; set; }
        public int FiledBy { get; set; }
        public string FiledByName { get; set; } = string.Empty;
        public DateTime FiledAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Outcome { get; set; }
        public DateTime? DecisionAt { get; set; }
        public int? DecisionByID { get; set; }
        public string? DecisionByName { get; set; }
    }

}
