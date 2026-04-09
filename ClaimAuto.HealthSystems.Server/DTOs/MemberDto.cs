namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // MemberID is auto-generated
    // Policy navigation property not needed — just send PolicyID
    public class MemberDto
    {
        public int PolicyID { get; set; }
        // The PolicyID returned when you created the policy

        public string Name { get; set; } = string.Empty;
        // Example: "Arjun Sharma"

        public DateTime DOB { get; set; }
        // Example: "1991-04-15"

        // Gender options: "Male" / "Female" / "Other"
        public string Gender { get; set; } = string.Empty;

        public string? MemberNumber { get; set; }
        // Example: "MBR-2024-001" — must be unique

        public DateTime CoverageStart { get; set; }
        // Example: "2024-01-01"

        public DateTime? CoverageEnd { get; set; }
        // Leave null if coverage is ongoing

        // Status options: "Active" / "Inactive" / "Suspended"
        public string Status { get; set; } = "Active";
    }
}