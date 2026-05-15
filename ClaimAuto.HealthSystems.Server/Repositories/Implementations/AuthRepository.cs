using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AuthRepository: IAuthRepository
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly ITotpRepository _totp;

        private const int MAX_MFA_ATTEMPTS = 5;
        private const int LOCKOUT_MINUTES = 15;

        public AuthRepository(
            ApplicationDbContext db,
            IConfiguration config,
            ITotpRepository totp)
        {
            _db = db;
            _config = config;
            _totp = totp;
        }

        // ── User lookups ────────────────────────────────────────────
        public Task<User?> GetUserByEmailAsync(string email) =>
            _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        public Task<User?> GetUserByIdAsync(int id) =>
            _db.Users.FindAsync(id).AsTask();

        public Task<bool> EmailExistsAsync(string email) =>
            _db.Users.AnyAsync(u => u.Email == email);

        // ── Password ────────────────────────────────────────────────
        public string HashPassword(string plain) =>
            BCrypt.Net.BCrypt.HashPassword(plain);

        public bool VerifyPassword(string plain, string hash) =>
            BCrypt.Net.BCrypt.Verify(plain, hash);

        // ── Register (transactional) ────────────────────────────────
        public async Task<User> RegisterUserAsync(User user, string plainPassword)
        {
            user.PasswordHash = HashPassword(plainPassword);
            user.MFAEnabled = false;
            user.Status = AccountStatus.Active;
            user.CreatedAt = user.UpdatedAt = DateTime.UtcNow;

            using var tx = await _db.Database.BeginTransactionAsync();
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await LogAuthActionAsync(user.UserID, "Register");
            await tx.CommitAsync();
            return user;
        }

        // ── Invitation (transactional) ──────────────────────────────
        public async Task<User> RegisterInvitedUserAsync(User user, string tempPassword)
        {
            user.PasswordHash = HashPassword(tempPassword);
            user.MFAEnabled = false;
            user.Status = AccountStatus.Active;
            user.MustChangePassword = true;                 // ← key flag
            user.CreatedAt = user.UpdatedAt = DateTime.UtcNow;

            using var tx = await _db.Database.BeginTransactionAsync();
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await LogAuthActionAsync(user.UserID, "UserInvited");
            await tx.CommitAsync();
            return user;
        }

        // ── JWT generation ─────────────────────────────────────────
        public string GenerateJwtToken(User user)
        {
            var jwtKey = _config["Jwt:Key"]!;
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
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_config["Jwt:ExpireMinutes"])),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateMfaToken(User user)
        {
            var jwtKey = _config["Jwt:Key"]!;
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
        new System.Security.Claims.Claim("mfa_user_id", user.UserID.ToString()),
        new System.Security.Claims.Claim("purpose", "mfa_verification"),
        new System.Security.Claims.Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(10),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);// This method generates a JWT token specifically for MFA verification. It includes claims to identify the user and the purpose of the token, and it has a short expiration time (10 minutes) to enhance security.
        }

        public int? ValidateMfaToken(string mfaToken)
        {
            try
            {
                var jwtKey = _config["Jwt:Key"]!;
                var tokenHandler = new JwtSecurityTokenHandler();
                var parameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _config["Jwt:Issuer"],
                    ValidAudience = _config["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };

                var principal = tokenHandler.ValidateToken(mfaToken, parameters, out _);

                if (principal.FindFirst("purpose")?.Value != "mfa_verification")
                    return null;

                var userIdClaim = principal.FindFirst("mfa_user_id")?.Value;
                return int.TryParse(userIdClaim, out int userId) ? userId : null;
            }
            catch
            {
                return null;
            }
        }
        // ── MFA lockout state ───────────────────────────────────────
        public async Task<bool> IsLockedOutAsync(User user)
        {
            if (user.MFAFailedAttempts < MAX_MFA_ATTEMPTS) return false;
            if (user.MFACodeExpiry == null) return false;
            return user.MFACodeExpiry > DateTime.UtcNow;
        }

        public async Task RecordFailedMfaAttemptAsync(User user)
        {
            user.MFAFailedAttempts++;
            if (user.MFAFailedAttempts >= MAX_MFA_ATTEMPTS)
                user.MFACodeExpiry = DateTime.UtcNow.AddMinutes(LOCKOUT_MINUTES);
            await _db.SaveChangesAsync();
        }

        public async Task ClearLockoutAsync(int userId)
        {
            var u = await _db.Users.FindAsync(userId);
            if (u == null) return;
            u.MFAFailedAttempts = 0;
            u.MFACodeExpiry = null;
            u.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public Task ResetMfaFailedAttemptsAsync(int userId) =>
            ClearLockoutAsync(userId);

        // ── MFA setup / confirm / disable ───────────────────────────
        public async Task<(string secretKey, string qrCodeUri)> InitiateMfaSetupAsync(int userId)
        {
            var user = await _db.Users.FindAsync(userId)
                ?? throw new InvalidOperationException("User not found");

            var secret = _totp.GenerateSecretKey();
            var qr = _totp.GenerateQrCodeUri(secret, user.Email);

            user.MFASecretKey = secret;
            user.MFAEnabled = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await LogAuthActionAsync(userId, "MFASetupInitiated");
            return (secret, qr);
        }

        public async Task ConfirmMfaSetupAsync(int userId)
        {
            var user = await _db.Users.FindAsync(userId)
                ?? throw new InvalidOperationException("User not found");
            user.MFAEnabled = true;
            user.MFAFailedAttempts = 0;
            user.MFACodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await LogAuthActionAsync(userId, "MFAEnabled");
        }

        public async Task DisableMfaAsync(int userId)
        {
            var user = await _db.Users.FindAsync(userId)
                ?? throw new InvalidOperationException("User not found");
            user.MFAEnabled = false;
            user.MFASecretKey = null;
            user.MFAFailedAttempts = 0;
            user.MFACodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await LogAuthActionAsync(userId, "MFADisabled");
        }

        //Audit
        public async Task LogAuthActionAsync(int userId, string action)
        {
            _db.AuditLogs.Add(new AuditLog
            {
                UserID = userId,
                Action = action,
                ResourceType = "User",
                ResourceID = userId.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        // ── Change password ─────────────────────────────────────────
        public async Task<bool> ChangePasswordAsync(int userId, string newPasswordHash)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return false;

            user.PasswordHash = newPasswordHash;
            user.UpdatedAt = DateTime.UtcNow;

            // If the user was on a temp password (invited / admin-reset), clear the flag
            if (user.MustChangePassword)
                user.MustChangePassword = false;

            await _db.SaveChangesAsync();
            await LogAuthActionAsync(userId, "ChangePassword");
            return true;
        }
    }
}