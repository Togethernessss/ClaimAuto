using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AuthRepository: IAuthRepository
    {
        private readonly ApplicationDbContext _db; // The Entity Framework Core database context for accessing user and authentication data.
        private readonly IConfiguration _config; 
        private readonly ITotpRepository _totp;// A repository for handling Time-based One-Time Passwords (TOTP) used in MFA.

        private const int MAX_MFA_ATTEMPTS = 5;
        private const int LOCKOUT_MINUTES = 15;

        // Password login lockout settings (OWASP A07) OWASP recommends locking out accounts after a certain number of failed login attempts to prevent brute-force attacks. These constants define the thresholds for that mechanism.
        private const int MAX_LOGIN_ATTEMPTS = 5;
        private const int LOGIN_LOCKOUT_MINUTES = 15;

        public AuthRepository(
            ApplicationDbContext db,
            IConfiguration config,
            ITotpRepository totp)
        {
            _db = db;
            _config = config;
            _totp = totp;
        }

        // User lookups 
        // Both methods now Include() the Organization so callers can
        // access user.Organization.Name without a second DB roundtrip.
        public Task<User?> GetUserByEmailAsync(string email) =>
            _db.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Email == email);

        public Task<User?> GetUserByIdAsync(int id) =>
            _db.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.UserID == id);

        public Task<bool> EmailExistsAsync(string email) =>
            _db.Users.AnyAsync(u => u.Email == email);


       
        // Password
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

            var claimsList = new List<System.Security.Claims.Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new(ClaimTypes.Name, user.Name),
                new(ClaimTypes.Role, user.Role.ToString()),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // Multi-tenant claim — only added if user has an organization
            if (user.OrganizationID.HasValue)
                claimsList.Add(new System.Security.Claims.Claim("org_id", user.OrganizationID.Value.ToString()));

            var claims = claimsList.ToArray();

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                double.TryParse(_config["Jwt:ExpireMinutes"], out var em) && em > 0 ? em : 60),
            signingCredentials: credentials
);

            return new JwtSecurityTokenHandler().WriteToken(token);// This method generates a JWT token for authenticated users. It includes standard claims like sub (user ID), email, name, role, and a unique jti. If the user belongs to an organization, it also includes an org_id claim for multi-tenant support. The token is signed with a symmetric key and has an expiration time defined in the configuration (defaulting to 60 minutes if not set).
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

                var principal = tokenHandler.ValidateToken(mfaToken, parameters, out _);// out _ means we don't care about the validated token object here, just the claims principal.

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

        // ─── Password login lockout (OWASP A07) ──────────────────────────
        // Mirrors the MFA lockout pattern but uses LoginFailedAttempts
        // and LoginLockoutEnd fields on the User entity.

        public Task<bool> IsLoginLockedOutAsync(User user)
        {
            if (user.LoginFailedAttempts < MAX_LOGIN_ATTEMPTS) return Task.FromResult(false);
            if (user.LoginLockoutEnd == null) return Task.FromResult(false);
            return Task.FromResult(user.LoginLockoutEnd > DateTime.UtcNow);
        }

        public async Task RecordFailedLoginAttemptAsync(User user)
        {
            user.LoginFailedAttempts++;
            if (user.LoginFailedAttempts >= MAX_LOGIN_ATTEMPTS)
                user.LoginLockoutEnd = DateTime.UtcNow.AddMinutes(LOGIN_LOCKOUT_MINUTES);
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await LogAuthActionAsync(user.UserID, "LoginFailed");
        }

        public async Task ResetLoginAttemptsAsync(int userId)
        {
            var u = await _db.Users.FindAsync(userId);
            if (u == null) return;
            u.LoginFailedAttempts = 0;
            u.LoginLockoutEnd = null;
            u.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

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
            // Look up the user's OrganizationID so the audit log is
            // correctly stamped for multi-tenant filtering.
            var orgId = await _db.Users
                .Where(u => u.UserID == userId)
                .Select(u => u.OrganizationID)
                .FirstOrDefaultAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserID = userId,
                Action = action,
                ResourceType = "User",
                ResourceID = userId.ToString(),
                Timestamp = DateTime.UtcNow,
                OrganizationID = orgId   // ← THIS IS THE FIX
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

        // ── Password Reset ──────────────────────────────────────────
        private const int RESET_TOKEN_TTL_MINUTES = 30;

        /// <summary>
        /// Creates a one-time password reset token for the given email.
        /// Returns the RAW token (only this call sees it — store only its hash).
        /// Returns null if the email does not exist (caller should still return 200).
        /// </summary>
        public async Task<string?> CreatePasswordResetTokenAsync(string email)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return null;
            if (user.Status != AccountStatus.Active) return null;

            // Invalidate any prior unused tokens for this user
            var stale = await _db.PasswordResetTokens
                .Where(t => t.UserID == user.UserID && !t.Used)
                .ToListAsync();
            foreach (var t in stale) t.Used = true;

            // Generate 32-byte cryptographically random token (URL-safe base64)
            var bytes = RandomNumberGenerator.GetBytes(32);
            var rawToken = Convert.ToBase64String(bytes)
                .Replace("+", "-").Replace("/", "_").Replace("=", "");// Make it URL-safe and remove padding chars.

            var hash = HashToken(rawToken);

            _db.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserID = user.UserID,
                TokenHash = hash,
                ExpiresAt = DateTime.UtcNow.AddMinutes(RESET_TOKEN_TTL_MINUTES),
                Used = false,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            await LogAuthActionAsync(user.UserID, "ForgotPasswordRequested");

            return rawToken;
        }

        /// <summary>
        /// Validates a raw token. Returns the userId if it's valid, unused and unexpired; else null.
        /// Does not consume the token.
        /// </summary>
        public async Task<int?> ValidatePasswordResetTokenAsync(string rawToken)
        {
            if (string.IsNullOrWhiteSpace(rawToken)) return null;

            var hash = HashToken(rawToken);
            var record = await _db.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.TokenHash == hash);

            if (record == null) return null;
            if (record.Used) return null;
            if (record.ExpiresAt < DateTime.UtcNow) return null;

            return record.UserID;
        }

        /// <summary>
        /// Consumes the token (marks Used=true) and updates the user's password.
        /// Returns false if the token is invalid/expired/already used.
        /// </summary>
        public async Task<bool> ResetPasswordWithTokenAsync(string rawToken, string newPasswordHash)
        {
            if (string.IsNullOrWhiteSpace(rawToken)) return false;

            var hash = HashToken(rawToken);

            using var tx = await _db.Database.BeginTransactionAsync();

            var record = await _db.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.TokenHash == hash);

            if (record == null || record.Used || record.ExpiresAt < DateTime.UtcNow)
                return false;

            var user = await _db.Users.FindAsync(record.UserID);
            if (user == null) return false;

            user.PasswordHash = newPasswordHash;
            user.MustChangePassword = false;
            user.UpdatedAt = DateTime.UtcNow;

            record.Used = true;
            record.UsedAt = DateTime.UtcNow;

            // Invalidate any other outstanding tokens for this user (defense in depth)
            var others = await _db.PasswordResetTokens
                .Where(t => t.UserID == user.UserID && !t.Used && t.Id != record.Id)
                .ToListAsync();
            foreach (var t in others) t.Used = true;

            await _db.SaveChangesAsync();
            await LogAuthActionAsync(user.UserID, "PasswordResetCompleted");

            await tx.CommitAsync();
            return true;
        }

        // Hash helper — SHA-256 hex
        private static string HashToken(string rawToken)// This method hashes the raw token using SHA-256 and returns the hash as a hexadecimal string. This way, the actual token value is never stored in the database, only its hash, which enhances security in case of a database breach.
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawToken));
            return Convert.ToHexString(bytes);
        }
    }
}