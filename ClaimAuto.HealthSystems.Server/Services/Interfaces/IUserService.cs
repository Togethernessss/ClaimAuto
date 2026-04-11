using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IUserService
    {
        Task<List<UserResponseDto>> GetAllAsync();
        Task<UserResponseDto?> GetByIdAsync(int id);
        Task<List<UserResponseDto>> GetByRoleAsync(UserRole role);
        Task<(bool Success, string Error, UserResponseDto? User)> CreateAsync(CreateUserDto dto);
        Task<(bool Success, string Error)> UpdateAsync(int id, User updatedUser);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}
