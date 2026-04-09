namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateUserDto
    public class CreateUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty; // plain text — hashed by controller
        public string Role { get; set; } = string.Empty;     // "Admin","InsuranceStaff","Policyholder","Hospital"
        public string? Phone { get; set; }
        public string? Department { get; set; }              // only for InsuranceStaff and Admin
        public bool MFAEnabled { get; set; } = false;
    }

    // ── LoginDto 
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    // ── UserResponseDto 
    public class UserResponseDto
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool MFAEnabled { get; set; }
        public string Status { get; set; } = string.Empty;   // "Active" or "Inactive"
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── UpdateUserDto 
    public class UpdateUserDto
    {
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool? MFAEnabled { get; set; }
        public string? Status { get; set; }                  // "Active" or "Inactive"
    }

    // ── AuthResponseDto 
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime Expiry { get; set; }
    }
}
