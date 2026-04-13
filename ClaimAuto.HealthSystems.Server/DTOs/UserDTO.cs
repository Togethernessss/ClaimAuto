namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;      // "Admin", "Hospital", etc.
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;   // NEW: for JWT login
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool MFAEnabled { get; set; }
    }

    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    // What the API returns (never expose password)
    public class UserResponseDto
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool MFAEnabled { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class MfaSetupResponseDto
    {
        public string SecretKey { get; set; } = string.Empty;
        public string QrCodeUri { get; set; } = string.Empty;
    }

    public class MfaVerifyDto
    {
        public string Code { get; set; } = string.Empty;
    }

    public class MfaLoginVerifyDto
    {
        public string MfaToken { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }
}

