namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // Only the fields Swagger needs to ask for
    // UserID, CreatedAt, UpdatedAt are auto-generated — not needed here
    public class UserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        // Role options: "Admin" / "InsuranceStaff" / "Policyholder" / "Hospital"

        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool MFAEnabled { get; set; } = false;
        // Status options: "Active" / "Inactive"
        public string Status { get; set; } = "Active";
    }
}