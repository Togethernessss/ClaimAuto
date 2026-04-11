using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repo;

        public UserService(IUserRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<UserResponseDto>> GetAllAsync()
        {
            var users = await _repo.GetAllAsync();
            return users.Select(MapToDto).ToList();
        }

        public async Task<UserResponseDto?> GetByIdAsync(int id)
        {
            var user = await _repo.GetByIdAsync(id);
            return user == null ? null : MapToDto(user);
        }

        public async Task<List<UserResponseDto>> GetByRoleAsync(UserRole role)
        {
            var users = await _repo.GetByRoleAsync(role);
            return users.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, UserResponseDto? User)> CreateAsync(CreateUserDto dto)
        {
            if (await _repo.EmailExistsAsync(dto.Email))
                return (false, "A user with this email already exists.", null);

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return (false, $"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital", null);

            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Phone = dto.Phone,
                Department = dto.Department,
                MFAEnabled = dto.MFAEnabled,
                Status = AccountStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var log = new AuditLog
            {
                Action = "CreateUser",
                ResourceType = "User",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreateUserWithAuditAsync(user, log);
            return (true, "", MapToDto(user));
        }

        public async Task<(bool Success, string Error)> UpdateAsync(int id, User updatedUser)
        {
            if (id != updatedUser.UserID)
                return (false, "ID in URL does not match ID in body.");

            var user = await _repo.GetByIdAsync(id);
            if (user == null)
                return (false, $"User with ID {id} not found.");

            user.Name = updatedUser.Name;
            user.Phone = updatedUser.Phone;
            user.Department = updatedUser.Department;
            user.MFAEnabled = updatedUser.MFAEnabled;
            user.Status = updatedUser.Status;
            user.UpdatedAt = DateTime.UtcNow;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var user = await _repo.GetByIdAsync(id);
            if (user == null)
                return (false, $"User with ID {id} not found.");

            user.Status = AccountStatus.Inactive;
            user.UpdatedAt = DateTime.UtcNow;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        private static UserResponseDto MapToDto(User user)
        {
            return new UserResponseDto
            {
                UserID = user.UserID,
                Name = user.Name,
                Role = user.Role.ToString(),
                Email = user.Email,
                Phone = user.Phone,
                Department = user.Department,
                MFAEnabled = user.MFAEnabled,
                Status = user.Status.ToString(),
                CreatedAt = user.CreatedAt
            };
        }
    }
}