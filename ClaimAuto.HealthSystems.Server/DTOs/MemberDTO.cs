namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateMemberDto
    {
        public int PolicyID { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime DOB { get; set; }
        public string Gender { get; set; } = string.Empty;  // "Male", "Female", "Other"
        public string? MemberNumber { get; set; }
        public string? ContactInfoJSON { get; set; }
        public DateTime CoverageStart { get; set; }
        public DateTime? CoverageEnd { get; set; }
    }

    public class UpdateMemberDto
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactInfoJSON { get; set; }
        public DateTime? CoverageEnd { get; set; }
        public string Status { get; set; } = string.Empty;  // "Active", "Inactive", "Suspended"
    }

    public class MemberResponseDto
    {
        public int MemberID { get; set; }
        public int PolicyID { get; set; }
        public string PolicyName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime DOB { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? MemberNumber { get; set; }
        public string? ContactInfoJSON { get; set; }
        public DateTime CoverageStart { get; set; }
        public DateTime? CoverageEnd { get; set; }
        public string Status { get; set; } = string.Empty;
    }

}
