using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : BaseController
    {
        private readonly IAuthRepository _auth;
        private readonly IConfiguration _config;
        private readonly ITotpRepository _totp;

        // Display-only constants used in user-facing error messages.
        // Authoritative values live in AuthRepository.
        private const int MAX_MFA_ATTEMPTS = 5;
        private const int LOCKOUT_MINUTES = 15;

        public AuthController(
            IAuthRepository auth,
            IConfiguration config,
            ITotpRepository totp)
        {
            _auth = auth;
            _config = config;
            _totp = totp;
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {

            //throw new KeyNotFoundException("Forced test of global exception handler"); // to test global exeption

            if (await _auth.EmailExistsAsync(dto.Email))
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                Phone = dto.Phone,
                Department = dto.Department
                // PasswordHash, MFAEnabled, Status, CreatedAt, UpdatedAt
                // are populated inside AuthRepository.RegisterUserAsync
            };

            user = await _auth.RegisterUserAsync(user, dto.Password);

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
            var user = await _auth.GetUserByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized("Invalid email or password.");

            if (user.Status != AccountStatus.Active)
                return Unauthorized("Account is inactive. Contact admin.");

            if (!_auth.VerifyPassword(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            // MFA required — issue intermediate token (10 min)
            if (user.MFAEnabled && !string.IsNullOrEmpty(user.MFASecretKey))
            {
                await _auth.ResetMfaFailedAttemptsAsync(user.UserID);

                var mfaToken = _auth.GenerateMfaToken(user);
                await _auth.LogAuthActionAsync(user.UserID, "LoginMFARequired");

                return Ok(new MfaLoginResponseDto
                {
                    RequiresMFA = true,
                    MfaToken = mfaToken,
                    Message = "Enter the verification code from your Authenticator app."
                });
            }

            // No MFA — issue real JWT directly
            var token = _auth.GenerateJwtToken(user);
            await _auth.LogAuthActionAsync(user.UserID, "Login");

            return Ok(new
            {
                Token = token,
                Expiration = DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_config["Jwt:ExpireMinutes"])),
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

        // POST: api/auth/verify-mfa
        // Step 2 of login — verify TOTP code from Authenticator app
        [HttpPost("verify-mfa")]
        public async Task<ActionResult> VerifyMfa(VerifyMfaDto dto)
        {
            int? userId = _auth.ValidateMfaToken(dto.MfaToken);
            if (userId == null)
                return Unauthorized("Invalid or expired MFA token. Please login again.");

            var user = await _auth.GetUserByIdAsync(userId.Value);
            if (user == null)
                return Unauthorized("User not found.");

            // Active lockout
            if (await _auth.IsLockedOutAsync(user))
                return Unauthorized($"Account temporarily locked due to too many failed attempts. Try again after {LOCKOUT_MINUTES} minutes.");

            // Lockout expired — reset counters so the user gets fresh attempts
            if (user.MFAFailedAttempts >= MAX_MFA_ATTEMPTS)
            {
                await _auth.ClearLockoutAsync(user.UserID);
                user.MFAFailedAttempts = 0;
                user.MFACodeExpiry = null;
            }

            // Verify TOTP code
            if (string.IsNullOrEmpty(user.MFASecretKey) ||
                !_totp.VerifyCode(user.MFASecretKey, dto.Code))
            {
                await _auth.RecordFailedMfaAttemptAsync(user);

                int remaining = MAX_MFA_ATTEMPTS - user.MFAFailedAttempts;
                if (remaining <= 0)
                    return Unauthorized($"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.");

                return Unauthorized($"Invalid verification code. {remaining} attempt(s) remaining.");
            }

            // Code verified — clear lockout and issue real JWT
            await _auth.ClearLockoutAsync(user.UserID);
            var token = _auth.GenerateJwtToken(user);
            await _auth.LogAuthActionAsync(user.UserID, "MFAVerified");

            return Ok(new
            {
                Token = token,
                Expiration = DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(_config["Jwt:ExpireMinutes"])),
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

        // POST: api/auth/mfa/setup  [Authorized]
        // Generates a TOTP secret and returns a QR code URI to scan
        [Authorize]
        [HttpPost("mfa/setup")]
        public async Task<ActionResult<MfaSetupResponseDto>> SetupMfa()
        {
            if (GetLoggedInUserId() is not int userId)
                return Unauthorized("Invalid token.");

            var user = await _auth.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (user.MFAEnabled && !string.IsNullOrEmpty(user.MFASecretKey))
                return BadRequest("MFA is already enabled. Disable it first to reconfigure.");

            var (secretKey, qrCodeUri) = await _auth.InitiateMfaSetupAsync(userId);

            return Ok(new MfaSetupResponseDto
            {
                SecretKey = secretKey,
                QrCodeUri = qrCodeUri,
                Message = "Scan the QR code in Microsoft Authenticator, then confirm with a code."
            });
        }

        // POST: api/auth/mfa/confirm  [Authorized]
        // User enters 6-digit code from Authenticator to activate MFA
        [Authorize]
        [HttpPost("mfa/confirm")]
        public async Task<ActionResult> ConfirmMfa(MfaConfirmDto dto)
        {
            if (GetLoggedInUserId() is not int userId)
                return Unauthorized("Invalid token.");

            var user = await _auth.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (string.IsNullOrEmpty(user.MFASecretKey))
                return BadRequest("No MFA setup in progress. Call /api/auth/mfa/setup first.");

            if (user.MFAEnabled)
                return BadRequest("MFA is already enabled.");

            if (!_totp.VerifyCode(user.MFASecretKey, dto.Code))
                return BadRequest("Invalid code. Make sure you scanned the correct QR code and try again.");

            await _auth.ConfirmMfaSetupAsync(userId);

            return Ok(new { Message = "MFA has been enabled successfully. You will need your Authenticator app for future logins." });
        }

        // POST: api/auth/mfa/disable  [Authorized]
        // Disables MFA for the logged-in user (requires current TOTP code)
        [Authorize]
        [HttpPost("mfa/disable")]
        public async Task<ActionResult> DisableMfa(MfaConfirmDto dto)
        {
            if (GetLoggedInUserId() is not int userId)
                return Unauthorized("Invalid token.");

            var user = await _auth.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            if (!user.MFAEnabled)
                return BadRequest("MFA is not enabled.");

            if (string.IsNullOrEmpty(user.MFASecretKey) ||
                !_totp.VerifyCode(user.MFASecretKey, dto.Code))
                return Unauthorized("Invalid verification code. Cannot disable MFA.");

            await _auth.DisableMfaAsync(userId);

            return Ok(new { Message = "MFA has been disabled." });
        }
    }
}
