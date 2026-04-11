using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success, string Error, UserResponseDto? User)> RegisterAsync(CreateUserDto dto);
        Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User, bool MfaRequired, string? MfaToken)> LoginAsync(LoginDto dto);




        // ── MFA ─────────────────────────────────
        Task<(bool Success, string Error, MfaSetupResponseDto? Setup)> SetupMfaAsync(int userId);
        Task<(bool Success, string Error)> EnableMfaAsync(int userId, string code);
        Task<(bool Success, string Error)> DisableMfaAsync(int userId, string code);
        Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User)> VerifyMfaLoginAsync(string mfaToken, string code);
    }
}
