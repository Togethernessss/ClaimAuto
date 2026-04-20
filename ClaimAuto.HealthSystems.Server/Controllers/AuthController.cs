using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : BaseController
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ITotpRepository _totpService;

        private const int MAX_MFA_ATTEMPTS = 5;
        private const int LOCKOUT_MINUTES = 15;

        public AuthController(
            ApplicationDbContext context,
            IConfiguration configuration,
            ITotpRepository totpService)
        {
            _context = context;
            _configuration = configuration;
            _totpService = totpService;
        }

        // ──────────────────────────────────────────────────────────
        // POST: api/auth/register  (unchanged from your current code)
        // ──────────────────────────────────────────────────────────
        [HttpPost("register")]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                PasswordHash = passwordHash,
                Phone = dto.Phone,
                Department = dto.Department,
                MFAEnabled = false, // MFA is enabled only after setup + confirm
                Status = AccountStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = user.UserID,
                    Action = "Register",
                    ResourceType = "User",
                    ResourceID = user.UserID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return CreatedAtAction(nameof(Register), new UserResponseDto
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
            });
        }

       
        // POST: api/auth/login
        // If MFA enabled → returns mfaToken (user must call verify-mfa)
        // If MFA disabled → returns JWT directly
      
        [HttpPost("login")]
        public async Task<ActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
                return Unauthorized("Invalid email or password.");

            if (user.Status != AccountStatus.Active)
                return Unauthorized("Account is inactive. Contact admin.");

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!isPasswordValid)
                return Unauthorized("Invalid email or password.");

            // ── MFA required ────────────────────────────────────
            if (user.MFAEnabled && !string.IsNullOrEmpty(user.MFASecretKey))
            {
                // Reset failed attempts on fresh login
                user.MFAFailedAttempts = 0;
                user.MFACodeExpiry = null;
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                string mfaToken = GenerateMfaToken(user);

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = user.UserID,
                    Action = "LoginMFARequired",
                    ResourceType = "User",
                    ResourceID = user.UserID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                return Ok(new MfaLoginResponseDto
                {
                    RequiresMFA = true,
                    MfaToken = mfaToken,
                    Message = "Enter the verification code from your Authenticator app."
                });
            }

            //No MFA — issue JWT directly 
            string token = GenerateJwtToken(user);

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "Login",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Token = token,
                Expiration = DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_configuration["Jwt:ExpireMinutes"])),
                User = new UserResponseDto
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
                }
            });
        }

        // ──────────────────────────────────────────────────────────
        // POST: api/auth/verify-mfa
        // Step 2 of login — verify TOTP code from Authenticator app
        // ──────────────────────────────────────────────────────────
        [HttpPost("verify-mfa")]
        public async Task<ActionResult> VerifyMfa(VerifyMfaDto dto)
        {
            int? userId = ValidateMfaToken(dto.MfaToken);
            if (userId == null)
                return Unauthorized("Invalid or expired MFA token. Please login again.");

            var user = await _context.Users.FindAsync(userId.Value);
            if (user == null)
                return Unauthorized("User not found.");

            // Check lockout
            if (user.MFAFailedAttempts >= MAX_MFA_ATTEMPTS)
            {
                if (user.MFACodeExpiry != null && user.MFACodeExpiry > DateTime.UtcNow)
                    return Unauthorized($"Account temporarily locked due to too many failed attempts. Try again after {LOCKOUT_MINUTES} minutes.");

                // Lockout expired — reset
                user.MFAFailedAttempts = 0;
                user.MFACodeExpiry = null;
            }

            // Verify TOTP code
            if (string.IsNullOrEmpty(user.MFASecretKey) ||
                !_totpService.VerifyCode(user.MFASecretKey, dto.Code))
            {
                user.MFAFailedAttempts++;

                // Set lockout window if max attempts reached
                if (user.MFAFailedAttempts >= MAX_MFA_ATTEMPTS)
                    user.MFACodeExpiry = DateTime.UtcNow.AddMinutes(LOCKOUT_MINUTES);

                await _context.SaveChangesAsync();

                int remaining = MAX_MFA_ATTEMPTS - user.MFAFailedAttempts;
                if (remaining <= 0)
                    return Unauthorized($"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.");

                return Unauthorized($"Invalid verification code. {remaining} attempt(s) remaining.");
            }

            // ── Code verified — clear lockout and issue JWT ─────
            user.MFAFailedAttempts = 0;
            user.MFACodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            string token = GenerateJwtToken(user);

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "MFAVerified",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Token = token,
                Expiration = DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_configuration["Jwt:ExpireMinutes"])),
                User = new UserResponseDto
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
                }
            });
        }

        // ──────────────────────────────────────────────────────────
        // POST: api/auth/mfa/setup  [Authorized]
        // Generates a TOTP secret and returns QR code URI
        // User must be logged in to set up MFA
        // ──────────────────────────────────────────────────────────
        [Authorize]
        [HttpPost("mfa/setup")]
        public async Task<ActionResult<MfaSetupResponseDto>> SetupMfa()
        {
            var userId = GetLoggedInUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (user.MFAEnabled && !string.IsNullOrEmpty(user.MFASecretKey))
                return BadRequest("MFA is already enabled. Disable it first to reconfigure.");

            // Generate new TOTP secret
            string secretKey = _totpService.GenerateSecretKey();
            string qrCodeUri = _totpService.GenerateQrCodeUri(secretKey, user.Email);

            // Store secret temporarily (MFA is NOT enabled yet — needs confirm step)
            user.MFASecretKey = secretKey;
            user.MFAEnabled = false; // Will be set to true after confirm
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "MFASetupInitiated",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new MfaSetupResponseDto
            {
                SecretKey = secretKey,
                QrCodeUri = qrCodeUri,
                Message = "Scan the QR code in Microsoft Authenticator, then confirm with a code."
            });
        }

        // ──────────────────────────────────────────────────────────
        // POST: api/auth/mfa/confirm  [Authorized]
        // User enters 6-digit code from Authenticator to confirm setup
        // ──────────────────────────────────────────────────────────
        [Authorize]
        [HttpPost("mfa/confirm")]
        public async Task<ActionResult> ConfirmMfa(MfaConfirmDto dto)
        {
            var userId = GetLoggedInUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (string.IsNullOrEmpty(user.MFASecretKey))
                return BadRequest("No MFA setup in progress. Call /api/auth/mfa/setup first.");

            if (user.MFAEnabled)
                return BadRequest("MFA is already enabled.");

            // Verify the code from Authenticator app
            if (!_totpService.VerifyCode(user.MFASecretKey, dto.Code))
                return BadRequest("Invalid code. Make sure you scanned the correct QR code and try again.");

            // ── Code valid — activate MFA ────────────────────────
            user.MFAEnabled = true;
            user.MFAFailedAttempts = 0;
            user.MFACodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "MFAEnabled",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new { Message = "MFA has been enabled successfully. You will need your Authenticator app for future logins." });
        }

        // ──────────────────────────────────────────────────────────
        // POST: api/auth/mfa/disable  [Authorized]
        // Disables MFA for the logged-in user (requires current TOTP code)
        // ──────────────────────────────────────────────────────────
        [Authorize]
        [HttpPost("mfa/disable")]
        public async Task<ActionResult> DisableMfa(MfaConfirmDto dto)
        {
            var userId = GetLoggedInUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (!user.MFAEnabled)
                return BadRequest("MFA is not enabled.");

            // Must provide valid TOTP code to disable
            if (string.IsNullOrEmpty(user.MFASecretKey) ||
                !_totpService.VerifyCode(user.MFASecretKey, dto.Code))
                return Unauthorized("Invalid verification code. Cannot disable MFA.");

            user.MFAEnabled = false;
            user.MFASecretKey = null;
            user.MFAFailedAttempts = 0;
            user.MFACodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "MFADisabled",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new { Message = "MFA has been disabled." });
        }

        // ── Private Helpers ─────────────────────────────────────

        private string GenerateMfaToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim("mfa_user_id", user.UserID.ToString()),
                new System.Security.Claims.Claim("purpose", "mfa_verification"),
                new System.Security.Claims.Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(10),
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
                var parameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidAudience = _configuration["Jwt:Audience"],
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
    }
}
