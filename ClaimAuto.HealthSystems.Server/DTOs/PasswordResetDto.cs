namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class PasswordResetDto
    {
        public class ForgotPasswordDto
        {
            public string Email { get; set; } = string.Empty;
        }

        // Step 2 — user submits the token from the email + new password
        public class ResetPasswordDto
        {
            public string Token { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        // Optional — used by the reset page to check token validity on load
        public class ValidateResetTokenDto
        {
            public string Token { get; set; } = string.Empty;
        }
    }
}