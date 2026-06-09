using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Helpers;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.VisualStudio.Web.CodeGenerators.Mvc.Templates.BlazorIdentity.Pages.Manage;
using NETCore.MailKit.Core;
using static ClaimAuto.HealthSystems.Server.DTOs.PasswordResetDto;

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
            private readonly IEmailServices _email;
            private readonly IOrganizationRepository _orgs;
            private readonly INotificationRepository _notif;

            // Display-only constants used in user-facing error messages.
            // Authoritative values live in AuthRepository.
            private const int MAX_MFA_ATTEMPTS = 5;
            private const int LOCKOUT_MINUTES = 15;
            private const int MAX_LOGIN_ATTEMPTS = 5;
            private const int LOGIN_LOCKOUT_MINUTES = 15;

            public AuthController(
                IAuthRepository auth,
                IConfiguration config,
                ITotpRepository totp,
                IEmailServices email,
                IOrganizationRepository orgs,
                INotificationRepository notif)
            {
                _auth = auth;
                _config = config;
                _totp = totp;
                _email = email;
                _orgs = orgs;
                _notif = notif;
            }

            // ── Internal helper: best-effort Account-category notification.
            // Wrapped in try/catch so a notification failure NEVER blocks the
            // auth action that succeeded. Failures are silent on purpose —
            // logging belongs in the notification repo itself.
            private async Task SafeNotifyAccountAsync(
                int userId, int? orgId, string message, NotificationSeverity severity)
            {
                try
                {
                    await _notif.CreateAsync(new Notification
                    {
                        UserID = userId,
                        ClaimID = null,// Account-level notification (not tied to a specific claim)
                        Message = message,
                        Category = NotificationCategory.Account,
                        Severity = severity,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = orgId,
                    });
                }
                catch { /* never block the auth action */ }
            }

            // POST: api/auth/register
            /// <summary>Registers a new Policyholder. Other roles are invite-only.</summary>
            [HttpPost("register")]
            [ProducesResponseType(StatusCodes.Status201Created)]
            [ProducesResponseType(StatusCodes.Status400BadRequest)]
            [ProducesResponseType(StatusCodes.Status409Conflict)]
            public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
            {
                if (!string.IsNullOrWhiteSpace(dto.Role) &&
                    !string.Equals(dto.Role, "Policyholder", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(
                        "Public registration is only available for Policyholders. " +
                        "Staff, Hospital, and Admin accounts are created by invitation only.");
                }

                if (!dto.OrganizationID.HasValue || dto.OrganizationID.Value <= 0)
                    return BadRequest("Please select an insurance provider.");

                if (!await _orgs.ExistsAsync(dto.OrganizationID.Value))
                    return BadRequest($"Insurance provider {dto.OrganizationID.Value} not found.");

                if (await _auth.EmailExistsAsync(dto.Email))
                    return Conflict("A user with this email already exists.");

                var passwordError = PasswordPolicy.Validate(dto.Password);
                if (passwordError != null)
                    return BadRequest(passwordError);

                var user = new User
                {
                    Name = dto.Name,
                    Role = UserRole.Policyholder,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Department = dto.Department,
                    OrganizationID = dto.OrganizationID.Value
                };

                user = await _auth.RegisterUserAsync(user, dto.Password);
                var freshUser = await _auth.GetUserByIdAsync(user.UserID);

                return CreatedAtAction(nameof(Register), BuildUserResponse(freshUser ?? user));
            }

            // POST: api/auth/login
            /// <summary>Authenticates a user. Returns JWT or MFA token. Enforces brute-force lockout (OWASP A07).</summary>
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

                // ─── OWASP A07: Reject early if account is currently locked out ───
                if (await _auth.IsLoginLockedOutAsync(user))
                {
                    var remainingMinutes = (int)Math.Ceiling(
                        (user.LoginLockoutEnd!.Value - DateTime.UtcNow).TotalMinutes);
                    return Unauthorized(
                        $"Account temporarily locked due to too many failed login attempts. " +
                        $"Try again in {remainingMinutes} minute(s).");
                }

                // If the previous lockout has expired naturally, reset the counter
                if (user.LoginFailedAttempts >= MAX_LOGIN_ATTEMPTS &&
                    user.LoginLockoutEnd != null &&
                    user.LoginLockoutEnd <= DateTime.UtcNow)
                {
                    await _auth.ResetLoginAttemptsAsync(user.UserID);
                    user.LoginFailedAttempts = 0;
                    user.LoginLockoutEnd = null;
                }

                // ─── Verify password ───
                if (!_auth.VerifyPassword(dto.Password, user.PasswordHash))
                {
                    await _auth.RecordFailedLoginAttemptAsync(user);

                    int remaining = MAX_LOGIN_ATTEMPTS - user.LoginFailedAttempts;
                    if (remaining <= 0)
                    {
                        // A1 — Account just locked. Notify user (and persist for trail).
                        var unlockTime = DateTime.UtcNow.AddMinutes(LOGIN_LOCKOUT_MINUTES);
                        await SafeNotifyAccountAsync(
                            user.UserID, user.OrganizationID,
                            $"Your account has been temporarily locked due to {MAX_LOGIN_ATTEMPTS} failed " +
                            $"login attempts. Lockout expires at " +
                            $"{unlockTime:dd MMM yyyy, hh:mm tt} UTC. " +
                            $"If this wasn't you, change your password as soon as the lockout expires.",
                            NotificationSeverity.Critical);

                        return Unauthorized(
                            $"Too many failed attempts. Account locked for {LOGIN_LOCKOUT_MINUTES} minutes.");
                    }

                    return Unauthorized(
                        $"Invalid email or password. {remaining} attempt(s) remaining before lockout.");
                }

                // ─── Password correct — reset the failure counter ───
                await _auth.ResetLoginAttemptsAsync(user.UserID);

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
                        double.TryParse(_config["Jwt:ExpireMinutes"], out var em) && em > 0 ? em : 60),
                    User = BuildUserResponse(user)
                });
            }

            // POST: api/auth/verify-mfa
            /// <summary>Verifies the TOTP code from the Authenticator app to complete login.</summary>
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

                if (await _auth.IsLockedOutAsync(user))
                    return Unauthorized($"Account temporarily locked due to too many failed attempts. Try again after {LOCKOUT_MINUTES} minutes.");

                if (user.MFAFailedAttempts >= MAX_MFA_ATTEMPTS)
                {
                    await _auth.ClearLockoutAsync(user.UserID);
                    user.MFAFailedAttempts = 0;
                    user.MFACodeExpiry = null;
                }

                if (string.IsNullOrEmpty(user.MFASecretKey) ||
                    !_totp.VerifyCode(user.MFASecretKey, dto.Code))
                {
                    await _auth.RecordFailedMfaAttemptAsync(user);

                    int remaining = MAX_MFA_ATTEMPTS - user.MFAFailedAttempts;
                    if (remaining <= 0)
                        return Unauthorized($"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.");

                    return Unauthorized($"Invalid verification code. {remaining} attempt(s) remaining.");
                }

                await _auth.ClearLockoutAsync(user.UserID);
                var token = _auth.GenerateJwtToken(user);
                await _auth.LogAuthActionAsync(user.UserID, "MFAVerified");

                return Ok(new
                {
                    Token = token,
                    Expiration = DateTime.UtcNow.AddMinutes(
                        double.TryParse(_config["Jwt:ExpireMinutes"], out var em) && em > 0 ? em : 60),
                    User = BuildUserResponse(user)
                });
            }

            // POST: api/auth/mfa/setup
            /// <summary>Generates a TOTP secret and QR code URI for MFA setup.</summary>
            [Authorize]
            [HttpPost("mfa/setup")]
            [ProducesResponseType(StatusCodes.Status200OK)]
            [ProducesResponseType(StatusCodes.Status400BadRequest)]
            [ProducesResponseType(StatusCodes.Status404NotFound)]
            public async Task<ActionResult<MfaSetupResponseDto>> SetupMfa()
            {
                if (GetLoggedInUserId() is not int userId)// This should never fail because of [Authorize], but we'll check just in case.
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

            // POST: api/auth/mfa/confirm
            /// <summary>Confirms MFA setup by verifying the first TOTP code.</summary>
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

                // A4 — MFA enabled. Positive security confirmation.
                await SafeNotifyAccountAsync(
                    user.UserID, user.OrganizationID,
                    "Two-factor authentication has been enabled on your account. " +
                    "Your account is now more secure — you'll be asked for a code from your " +
                    "Authenticator app on each sign-in.",
                    NotificationSeverity.Info);

                return Ok(new { Message = "MFA has been enabled successfully. You will need your Authenticator app for future logins." });
            }

            // POST: api/auth/mfa/disable
            /// <summary>Disables MFA for the logged-in user. Requires current TOTP code.</summary>
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

                // A5 — MFA disabled. Higher severity (Warning) because this REMOVES a
                // security control — the user should notice immediately if it wasn't them.
                await SafeNotifyAccountAsync(
                    user.UserID, user.OrganizationID,
                    $"Two-factor authentication was disabled at {DateTime.UtcNow:dd MMM yyyy, hh:mm tt} UTC. " +
                    "If this wasn't you, re-enable MFA from Account Settings and change your password.",
                    NotificationSeverity.Warning);

                return Ok(new { Message = "MFA has been disabled." });
            }

            // POST: api/auth/change-password
            /// <summary>Changes the logged-in user's password.</summary>
            [Authorize]
            [HttpPost("change-password")]
            [ProducesResponseType(StatusCodes.Status200OK)]
            [ProducesResponseType(StatusCodes.Status400BadRequest)]
            [ProducesResponseType(StatusCodes.Status401Unauthorized)]
            [ProducesResponseType(StatusCodes.Status404NotFound)]
            public async Task<ActionResult> ChangePassword(ChangePasswordDto dto)
            {
                if (GetLoggedInUserId() is not int userId)
                    return Unauthorized("Invalid token.");

                if (string.Equals(dto.CurrentPassword, dto.NewPassword))
                    return BadRequest("New password must be different from your current password.");

                var passwordError = PasswordPolicy.Validate(dto.NewPassword);
                if (passwordError != null)
                    return BadRequest(passwordError);

                var user = await _auth.GetUserByIdAsync(userId);
                if (user == null)
                    return NotFound("User not found.");

                if (!_auth.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
                    return Unauthorized("Current password is incorrect.");

                var newHash = _auth.HashPassword(dto.NewPassword);
                var ok = await _auth.ChangePasswordAsync(userId, newHash);
                if (!ok)
                    return NotFound("User not found.");

                // A2 — Password changed successfully. Audit trail for the user.
                await SafeNotifyAccountAsync(
                    user.UserID, user.OrganizationID,
                    $"Your password was changed at {DateTime.UtcNow:dd MMM yyyy, hh:mm tt} UTC. " +
                    $"If this wasn't you, contact support immediately.",
                    NotificationSeverity.Info);

                return Ok(new { Message = "Password changed successfully." });
            }

            // POST: api/auth/forgot-password
            /// <summary>Initiates a password reset. Always returns 200 (no user enumeration).</summary>
            [HttpPost("forgot-password")]
            [ProducesResponseType(StatusCodes.Status200OK)]
            public async Task<ActionResult> ForgotPassword(ForgotPasswordDto dto)
            {
                if (string.IsNullOrWhiteSpace(dto.Email))
                    return Ok(new { Message = "If that email is registered, a reset link has been sent." });

                var rawToken = await _auth.CreatePasswordResetTokenAsync(dto.Email);

                if (rawToken != null)
                {
                    var user = await _auth.GetUserByEmailAsync(dto.Email);
                    if (user != null)
                    {
                        var baseUrl = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
                        var resetLink = $"{baseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";

                        try
                        {
                            await _email.SendPasswordResetAsync(user.Email, user.Name, resetLink);
                        }
                        catch
                        {
                            // Swallow — we don't reveal email-send failures (anti-enumeration).
                        }

                        // A3 — Password reset requested. In-app trail so user notices if
                        // someone else triggers a reset on their account.
                        await SafeNotifyAccountAsync(
                            user.UserID, user.OrganizationID,
                            "A password reset link has been sent to your email. " +
                            "The link expires in 30 minutes. If you didn't request this, " +
                            "you can safely ignore the email — your current password still works.",
                            NotificationSeverity.Info);
                    }
                }

                return Ok(new { Message = "If that email is registered, a reset link has been sent." });
            }

            // POST: api/auth/reset-password/validate
            /// <summary>Checks whether a reset token is currently valid.</summary>
            [HttpPost("reset-password/validate")]
            [ProducesResponseType(StatusCodes.Status200OK)] // ProduceResponseType doesn't support multiple 200 variants, so we'll return { Valid: false } for invalid tokens instead of 400.
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
            public async Task<ActionResult> ValidateResetToken(ValidateResetTokenDto dto)
            {
                var userId = await _auth.ValidatePasswordResetTokenAsync(dto.Token);
                if (userId == null)
                    return BadRequest("This reset link is invalid or has expired.");

                return Ok(new { Valid = true });
            }

            // POST: api/auth/reset-password
            /// <summary>Consumes a reset token and sets a new password.</summary>
            [HttpPost("reset-password")]
            [ProducesResponseType(StatusCodes.Status200OK)]
            [ProducesResponseType(StatusCodes.Status400BadRequest)]
            public async Task<ActionResult> ResetPassword(ResetPasswordDto dto)
            {
                if (string.IsNullOrWhiteSpace(dto.Token))
                    return BadRequest("Reset token is required.");

                var policyError = PasswordPolicy.Validate(dto.NewPassword);
                if (policyError != null)
                    return BadRequest(policyError);

                var newHash = _auth.HashPassword(dto.NewPassword);
                var ok = await _auth.ResetPasswordWithTokenAsync(dto.Token, newHash);
                if (!ok)
                    return BadRequest("This reset link is invalid or has expired.");

                return Ok(new { Message = "Your password has been reset. You can now sign in." });
            }

            /// <summary>
            /// Returns the calling user's current account info.
            /// Used by the frontend to poll for status changes (deactivation).
            /// UserStatusMiddleware intercepts this call automatically if the
            /// account has been deactivated, so the controller body never runs.
            /// </summary>
            [HttpGet("me")]
            [Authorize]
            [ProducesResponseType(StatusCodes.Status200OK)]
            [ProducesResponseType(StatusCodes.Status401Unauthorized)]
            public async Task<ActionResult<UserResponseDto>> Me()
            {
                var userId = GetLoggedInUserId();
                if (userId == null) return Unauthorized();

                var user = await _auth.GetUserByIdAsync(userId.Value);
                if (user == null) return Unauthorized();

                return Ok(BuildUserResponse(user));
            }

            // ── Helper: builds the standard UserResponseDto used by Login/VerifyMfa/Register.
            private static UserResponseDto BuildUserResponse(User user) => new()// This method ensures we always return a consistent set of user info in auth-related responses.
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
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                OrganizationID = user.OrganizationID,
                OrganizationName = user.Organization?.Name,
                OrganizationShortCode = user.Organization?.ShortCode,
                OrganizationBrandColor = user.Organization?.BrandColor,
                OrganizationLogoUrl = user.Organization?.LogoUrl,
                OrganizationSupportEmail = user.Organization?.SupportEmail,
                OrganizationSupportPhone = user.Organization?.SupportPhone,
                IsInNetwork = user.IsInNetwork,
                ProfilePhoto = user.ProfilePhoto,
            };
        }
    }