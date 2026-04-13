using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using OtpNet;
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

        // ── Register (UNCHANGED) ──────────────────────
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
                MFAEnabled = false,  // MFA is always off at registration; user enables it later
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

        // ── Login (MODIFIED for MFA) ──────────────────
        public async Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User, bool MfaRequired, string? MfaToken)> LoginAsync(LoginDto dto)
        {
            var user = await _repo.GetByEmailAsync(dto.Email);
            if (user == null)
                return (false, "Invalid email or password.", null, null, null, false, null);

            if (user.Status != AccountStatus.Active)
                return (false, "Account is inactive. Contact admin.", null, null, null, false, null);

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!isPasswordValid)
                return (false, "Invalid email or password.", null, null, null, false, null);

            // ── MFA CHECK ──────────────────────────────
            if (user.MFAEnabled && !string.IsNullOrEmpty(user.MfaSecretKey))
            {
                // Password correct but MFA is enabled → return MFA challenge
                string mfaToken = GenerateMfaToken(user);

                await _repo.AddAuditLogAsync(new AuditLog
                {
                    UserID = user.UserID,
                    Action = "LoginMfaChallenge",
                    ResourceType = "User",
                    ResourceID = user.UserID.ToString(),
                    Timestamp = DateTime.UtcNow
                });

                return (true, "", null, null, null, true, mfaToken);
            }

            // ── No MFA → issue JWT directly (same as before) ──
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
            return (true, "", token, expiration, response, false, null);
        }

        // ── Setup MFA (generates secret + QR URI) ────
        public async Task<(bool Success, string Error, MfaSetupResponseDto? Setup)> SetupMfaAsync(int userId)
        {
            var user = await _repo.GetByIdAsync(userId);
            if (user == null)
                return (false, "User not found.", null);

            if (user.MFAEnabled)
                return (false, "MFA is already enabled. Disable it first to reconfigure.", null);

            // Generate a new TOTP secret
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretKey);

            // Save secret to user (not enabled yet — just stored)
            user.MfaSecretKey = base32Secret;
            user.UpdatedAt = DateTime.UtcNow;
            await _repo.SaveChangesAsync();

            // Generate otpauth URI for QR code scanning
            var issuer = "ClaimAutoHealthSystems";
            var qrUri = $"otpauth://totp/{issuer}:{user.Email}?secret={base32Secret}&issuer={issuer}&digits=6&period=30";

            return (true, "", new MfaSetupResponseDto
            {
                SecretKey = base32Secret,
                QrCodeUri = qrUri
            });
        }

        // ── Enable MFA (verify code to confirm setup) ─
        public async Task<(bool Success, string Error)> EnableMfaAsync(int userId, string code)
        {
            var user = await _repo.GetByIdAsync(userId);
            if (user == null)
                return (false, "User not found.");

            if (user.MFAEnabled)
                return (false, "MFA is already enabled.");

            if (string.IsNullOrEmpty(user.MfaSecretKey))
                return (false, "MFA has not been set up. Call /api/auth/mfa/setup first.");

            // Validate the TOTP code
            if (!ValidateTotp(user.MfaSecretKey, code))
                return (false, "Invalid MFA code. Please try again with a fresh code from your authenticator app.");

            user.MFAEnabled = true;
            user.UpdatedAt = DateTime.UtcNow;
            await _repo.SaveChangesAsync();

            await _repo.AddAuditLogAsync(new AuditLog
            {
                UserID = userId,
                Action = "EnableMFA",
                ResourceType = "User",
                ResourceID = userId.ToString(),
                Timestamp = DateTime.UtcNow
            });

            return (true, "");
        }

        // ── Disable MFA ───────────────────────────────
        public async Task<(bool Success, string Error)> DisableMfaAsync(int userId, string code)
        {
            var user = await _repo.GetByIdAsync(userId);
            if (user == null)
                return (false, "User not found.");

            if (!user.MFAEnabled)
                return (false, "MFA is not enabled.");

            // Must verify TOTP to disable (security)
            if (!ValidateTotp(user.MfaSecretKey!, code))
                return (false, "Invalid MFA code. Cannot disable MFA without valid code.");

            user.MFAEnabled = false;
            user.MfaSecretKey = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _repo.SaveChangesAsync();

            await _repo.AddAuditLogAsync(new AuditLog
            {
                UserID = userId,
                Action = "DisableMFA",
                ResourceType = "User",
                ResourceID = userId.ToString(),
                Timestamp = DateTime.UtcNow
            });

            return (true, "");
        }

        // ── Verify MFA Login (step 2 of MFA login) ───
        public async Task<(bool Success, string Error, string? Token, DateTime? Expiration, UserResponseDto? User)> VerifyMfaLoginAsync(string mfaToken, string code)
        {
            // Decode the MFA token to get userId
            var userId = ValidateMfaToken(mfaToken);
            if (userId == null)
                return (false, "Invalid or expired MFA token. Please login again.", null, null, null);

            var user = await _repo.GetByIdAsync(userId.Value);
            if (user == null)
                return (false, "User not found.", null, null, null);

            if (!user.MFAEnabled || string.IsNullOrEmpty(user.MfaSecretKey))
                return (false, "MFA is not configured for this user.", null, null, null);

            // Validate the TOTP code
            if (!ValidateTotp(user.MfaSecretKey, code))
                return (false, "Invalid MFA code. Please try again.", null, null, null);

            // MFA verified → issue full JWT
            string token = GenerateJwtToken(user);
            var expiration = DateTime.UtcNow.AddMinutes(
                Convert.ToDouble(_configuration["Jwt:ExpireMinutes"]));

            await _repo.AddAuditLogAsync(new AuditLog
            {
                UserID = user.UserID,
                Action = "LoginMfaVerified",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });

            var response = MapToDto(user);
            return (true, "", token, expiration, response);
        }

        // ══════════════════════════════════════════════
        // PRIVATE HELPERS
        // ══════════════════════════════════════════════

        private bool ValidateTotp(string base32Secret, string code)
        {
            var secretBytes = Base32Encoding.ToBytes(base32Secret);
            var totp = new Totp(secretBytes);
            return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
        }

        // MFA Token = short-lived JWT (5 min) with purpose "mfa" — NOT a full auth token
        private string GenerateMfaToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
                new System.Security.Claims.Claim("purpose", "mfa"),
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(5),  // Only 5 minutes to complete MFA
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private int? ValidateMfaToken(string mfaToken)
        {
            try
            {
                var jwtKey = _configuration["Jwt:Key"]!;
                var tokenHandler = new JwtSecurityTokenHandler();
                var validationParams = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidAudience = _configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };

                var principal = tokenHandler.ValidateToken(mfaToken, validationParams, out _);

                // Verify this is an MFA token, not a regular JWT
                var purposeClaim = principal.FindFirst("purpose")?.Value;
                if (purposeClaim != "mfa")
                    return null;

                var subClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (int.TryParse(subClaim, out var userId))
                    return userId;

                return null;
            }
            catch
            {
                return null; // Token invalid or expired
            }
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

