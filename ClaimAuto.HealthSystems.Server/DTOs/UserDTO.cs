namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateUserDto
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
        public int? OrganizationID { get; set; }             // ← which insurance company they're registering under
        public bool IsInNetwork { get; set; } = true;
    }

    // ── InviteUserDto — admin invites a user; no password (system generates one)
    public class InviteUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;   // "Admin","InsuranceStaff","Policyholder","Hospital"
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool IsInNetwork { get; set; } = true;
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
        public bool MustChangePassword { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // ─── Multi-tenant — which insurance company this user belongs to ───
        // ─── Multi-tenant — which insurance company this user belongs to ───
        public int? OrganizationID { get; set; }
        public string? OrganizationName { get; set; }
        public string? OrganizationShortCode { get; set; }
        public string? OrganizationBrandColor { get; set; }
        public string? OrganizationLogoUrl { get; set; }
        public string? OrganizationSupportEmail { get; set; }   // ← NEW
        public string? OrganizationSupportPhone { get; set; }   // ← NEW
        public bool IsInNetwork { get; set; }

        // ─── Profile photo (base64 data URL) — see User.ProfilePhoto ────
        public string? ProfilePhoto { get; set; }
    }

    // ── UpdatePhotoDto — used by PUT /api/users/{id}/photo
    public class UpdatePhotoDto
    {
        /// <summary>Base64 data URL e.g. "data:image/png;base64,iVBORw0…". Required.</summary>
        public string? ProfilePhoto { get; set; }
    }
}

    // ── UpdateUserDto 
    public class UpdateUserDto
    {
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public bool? MFAEnabled { get; set; }
        public string? Status { get; set; }                  // "Active" or "Inactive"
        public bool? IsInNetwork { get; set; }
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

    // ── MFA Setup Response (QR code data for Authenticator app)
    public class MfaSetupResponseDto
    {
        public string SecretKey { get; set; } = string.Empty;      // Manual entry key
        public string QrCodeUri { get; set; } = string.Empty;      // otpauth:// URI for QR
        public string Message { get; set; } = "Scan the QR code in Microsoft Authenticator, then confirm with a code.";
    }

    // ── MFA Confirm Setup
    public class MfaConfirmDto
    {
        public string Code { get; set; } = string.Empty;           // 6-digit code from app
    }

    // ── MFA Login Response (returned when MFA is required)
    public class MfaLoginResponseDto
    {
        public bool RequiresMFA { get; set; } = true;
        public string MfaToken { get; set; } = string.Empty;
        public string Message { get; set; } = "Enter the verification code from your Authenticator app.";
    }

    // ── MFA Verify (login step 2)
    public class VerifyMfaDto
    {
        public string MfaToken { get; set; } = string.Empty;       // Temporary token from login
        public string Code { get; set; } = string.Empty;           // 6-digit code from app
    }

    // ── UpdateUserStatusDto — admin toggles a stakeholder Active / Inactive
    public class UpdateUserStatusDto
    {
        /// <summary>"Active" or "Inactive"</summary>
        public string Status { get; set; } = string.Empty;
    }
