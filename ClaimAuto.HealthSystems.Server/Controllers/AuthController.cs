using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Helpers;

namespace ClaimAuto.HealthSystems.Server.Controllers
{   /// <summary>Handles user authentication, registration, and MFA operations.</summary>
    [ApiController]
    [Route("api/auth")]
    [Produces("application/json")]
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
        /// <summary>Registers a new user account.</summary>
        /// <param name="dto">User registration details including name, email, password, and role.</param>
        /// <response code="201">User created successfully.</response>
        /// <response code="400">Invalid role provided.</response>
        /// <response code="409">Email already exists.</response>
        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {

            //throw new KeyNotFoundException("Forced test of global exception handler"); // to test global exeption

            if (await _auth.EmailExistsAsync(dto.Email))
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            // Enforce password policy
            var passwordError = PasswordPolicy.Validate(dto.Password);
            if (passwordError != null)
                return BadRequest(passwordError);

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
                MustChangePassword = user.MustChangePassword,
                Status = user.Status.ToString(),
                CreatedAt = user.CreatedAt
            });
        }

        // POST: api/auth/login
        // If MFA enabled → returns mfaToken (user must call verify-mfa)
        // If MFA disabled → returns JWT directly
        /// <summary>Authenticates a user. Returns JWT if MFA is disabled, or an MFA token if MFA is enabled.</summary>
        /// <param name="dto">Login credentials (email and password).</param>
        /// <response code="200">Login successful — returns JWT token or MFA token.</response>
        /// <response code="401">Invalid credentials or inactive account.</response>
        [HttpPost("login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
                    MustChangePassword = user.MustChangePassword,
                    Status = user.Status.ToString(),
                    CreatedAt = user.CreatedAt
                }
            });
        }

        // POST: api/auth/verify-mfa
        // Step 2 of login — verify TOTP code from Authenticator app
        /// <summary>Verifies the TOTP code from the Authenticator app to complete login.</summary>
        /// <param name="dto">MFA token and 6-digit TOTP code.</param>
        /// <response code="200">MFA verified — returns JWT token.</response>
        /// <response code="401">Invalid or expired MFA token, or incorrect TOTP code.</response>
        [HttpPost("verify-mfa")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
                    MustChangePassword = user.MustChangePassword,
                    Status = user.Status.ToString(),
                    CreatedAt = user.CreatedAt
                }
            });
        }

        // POST: api/auth/mfa/setup  [Authorized]
        // Generates a TOTP secret and returns a QR code URI to scan
        /// <summary>Generates a TOTP secret and QR code URI for MFA setup. Requires a valid JWT.</summary>
        /// <response code="200">Returns secret key and QR code URI to scan in Authenticator app.</response>
        /// <response code="400">MFA is already enabled.</response>
        /// <response code="404">User not found.</response>
        [Authorize]
        [HttpPost("mfa/setup")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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
        /// <summary>Confirms MFA setup by verifying the first TOTP code from the Authenticator app.</summary>
        /// <param name="dto">6-digit TOTP code from Authenticator app.</param>
        /// <response code="200">MFA enabled successfully.</response>
        /// <response code="400">Invalid code or MFA already enabled.</response>
        /// <response code="404">User not found.</response>
        [Authorize]
        [HttpPost("mfa/confirm")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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
        /// <summary>Disables MFA for the logged-in user. Requires a valid current TOTP code.</summary>
        /// <param name="dto">Current 6-digit TOTP code to confirm identity.</param>
        /// <response code="200">MFA disabled successfully.</response>
        /// <response code="400">MFA is not enabled.</response>
        /// <response code="401">Invalid TOTP code.</response>
        /// <response code="404">User not found.</response>
        [Authorize]
        [HttpPost("mfa/disable")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        // POST: api/auth/change-password  [Authorized]
        /// <summary>Changes the logged-in user's password. Requires current password + new password.</summary>
        /// <param name="dto">Current password and new password.</param>
        /// <response code="200">Password changed successfully.</response>
        /// <response code="400">New password doesn't meet policy, or is same as current.</response>
        /// <response code="401">Current password is incorrect, or invalid token.</response>
        /// <response code="404">User not found.</response>
        [Authorize]
        [HttpPost("change-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> ChangePassword(ChangePasswordDto dto)
        {
            // 1. Identify the caller from JWT
            if (GetLoggedInUserId() is not int userId)
                return Unauthorized("Invalid token.");

            // 2. Sanity: new password must differ from current
            if (string.Equals(dto.CurrentPassword, dto.NewPassword))
                return BadRequest("New password must be different from your current password.");

            // 3. Validate new password against policy
            var passwordError = PasswordPolicy.Validate(dto.NewPassword);
            if (passwordError != null)
                return BadRequest(passwordError);

            // 4. Look up the user
            var user = await _auth.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            // 5. Verify current password (proves the caller knows it — defeats stolen-session attacks)
            if (!_auth.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
                return Unauthorized("Current password is incorrect.");

            // 6. Hash + persist the new password (+ audit)
            var newHash = _auth.HashPassword(dto.NewPassword);
            var ok = await _auth.ChangePasswordAsync(userId, newHash);
            if (!ok)
                return NotFound("User not found.");

            return Ok(new { Message = "Password changed successfully." });
        }
    }
}
