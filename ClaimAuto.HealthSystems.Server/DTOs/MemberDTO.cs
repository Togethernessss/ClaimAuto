namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateMemberDto 
    public class CreateMemberDto
    {
        public int PolicyID { get; set; }                        // which policy covers this member
        public string Name { get; set; } = string.Empty;
        public DateTime DOB { get; set; }                        // immutable after creation
        public string Gender { get; set; } = string.Empty;      // "Male","Female","Other" — immutable
        public string? MemberNumber { get; set; }
        public string? ContactInfoJSON { get; set; }
        public DateTime CoverageStart { get; set; }
    }

    // ── UpdateMemberDto 
    public class UpdateMemberDto
    {
        public string? Name { get; set; }
        public string? ContactInfoJSON { get; set; }
        public DateTime? CoverageEnd { get; set; }
        public string? Status { get; set; }     // "Active","Inactive","Suspended"
    }

    // ── MemberResponseDto 
    public class MemberResponseDto
    {
        public int MemberID { get; set; }
        public int PolicyID { get; set; }
        public string PolicyName { get; set; } = string.Empty;  // resolved from Policy table
        public string Name { get; set; } = string.Empty;
        public DateTime DOB { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? MemberNumber { get; set; }
        public string? ContactInfoJSON { get; set; }
        public DateTime CoverageStart { get; set; }
        public DateTime? CoverageEnd { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // ── EligibilityResponseDto 
    public class EligibilityResponseDto
    {
        public int MemberID { get; set; }
        public int PolicyID { get; set; }
        public string Status { get; set; } = string.Empty;      // "Active" or not
        public decimal RemainingBenefit { get; set; }
        public decimal DeductibleMet { get; set; }
        public bool PreAuthRequired { get; set; }
        public DateTime CheckedAt { get; set; }
        public string Source { get; set; } = string.Empty;      // "RealTimeAPI","Cached","Manual"
        public int? TTL { get; set; }                            // cache validity in seconds
    }
}
