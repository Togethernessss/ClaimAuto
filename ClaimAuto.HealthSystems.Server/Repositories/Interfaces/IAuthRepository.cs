using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAuthRepository
    {
        //User lookup (read)
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByIdAsync(int id);
        Task<bool> EmailExistsAsync(string email);

        //Registration (write)
        Task<User> RegisterUserAsync(User user, string plainPassword);

        //Password
        string HashPassword(string plainPassword);
        bool VerifyPassword(string plainPassword, string hash);

        //JWT (real login token)
        string GenerateJwtToken(User user);

        //MFA token (intermediate, 10-min)
        string GenerateMfaToken(User user);
        int? ValidateMfaToken(string mfaToken);   // null on failure

        //MFA lockout state 
        Task ResetMfaFailedAttemptsAsync(int userId);
        Task<bool> IsLockedOutAsync(User user);
        Task RecordFailedMfaAttemptAsync(User user);
        Task ClearLockoutAsync(int userId);

        //MFA state transitions
        Task<(string secretKey, string qrCodeUri)> InitiateMfaSetupAsync(int userId);
        Task ConfirmMfaSetupAsync(int userId);
        Task DisableMfaAsync(int userId);

        //Audit (cross-cutting helper)
        Task LogAuthActionAsync(int userId, string action);

        // Change password (re-hashes new password, clears MustChangePassword flag, audits)
        Task<bool> ChangePasswordAsync(int userId, string newPasswordHash);

        // Admin invitation: creates user with temp password + MustChangePassword=true, audits "UserInvited"
        Task<User> RegisterInvitedUserAsync(User user, string tempPassword);

        // Password reset (forgot-password flow)
        Task<string?> CreatePasswordResetTokenAsync(string email);   // returns raw token, or null if email not found
        Task<int?> ValidatePasswordResetTokenAsync(string rawToken); // returns userId on success
        Task<bool> ResetPasswordWithTokenAsync(string rawToken, string newPasswordHash);
    }
}
