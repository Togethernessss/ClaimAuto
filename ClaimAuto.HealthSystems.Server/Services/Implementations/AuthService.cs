using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _repo;
        private readonly IConfiguration _configuration;

        public AuthService(IAuthRepository repo, IConfiguration configuration)
        {
            _repo = repo;
            _configuration = configuration;
        }

        public async Task<(bool Success, string Error, UserResponseDto? User)> RegisterAsync(CreateUserDto dto)
        {
            if (await _repo.EmailExistsAsync(dto.Email))
                return (false, "A user with this email already exists.", null);

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return (false, $"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital", null);

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                PasswordHash = passwordHash,
                Phone = dto.Phone,
                Department = dto.Department,
                MFAEnabled = dto.MFAEnabled,
                Status = AccountStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var log = new AuditLog
            {
                Action = "Register",
                ResourceType = "User",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreateUserWithAuditAsync(user, log);

            var response = MapToDto(user);
            return (true, "", response);
        }

        public async Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User)> LoginAsync(LoginDto dto)
        {
            var user = await _repo.GetByEmailAsync(dto.Email);
            if (user == null)
                return (false, "Invalid email or password.", null, null, null);

            if (user.Status != AccountStatus.Active)
                return (false, "Account is inactive. Contact admin.", null, null, null);

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!isPasswordValid)
                return (false, "Invalid email or password.", null, null, null);

            string token = GenerateJwtToken(user);
            var expiration = DateTime.UtcNow.AddMinutes(
                Convert.ToDouble(_configuration["Jwt:ExpireMinutes"]));

            await _repo.AddAuditLogAsync(new AuditLog
            {
                UserID = user.UserID,
                Action = "Login",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });

            var response = MapToDto(user);
            return (true, "", token, expiration, response);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Email, user.Email),
                new System.Security.Claims.Claim(ClaimTypes.Name, user.Name),
                new System.Security.Claims.Claim(ClaimTypes.Role, user.Role.ToString()),
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_configuration["Jwt:ExpireMinutes"])),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
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