using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success, string Error, UserResponseDto? User)> RegisterAsync(CreateUserDto dto);
        Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User)> LoginAsync(LoginDto dto);
    }
}
