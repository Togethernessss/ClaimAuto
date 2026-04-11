using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _service;

        public AuthController(IAuthService service)
        {
            _service = service;
        }

        // POST: api/auth/register (UNCHANGED)
        [HttpPost("register")]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {
            var result = await _service.RegisterAsync(dto);

            if (!result.Success)
            {
                if (result.Error.Contains("already exists"))
                    return Conflict(result.Error);
                return BadRequest(result.Error);
            }

            return CreatedAtAction(nameof(Register), result.User);
        }

        // POST: api/auth/login (MODIFIED — returns MFA challenge if enabled)
        [HttpPost("login")]
        public async Task<ActionResult> Login(LoginDto dto)
        {
            var result = await _service.LoginAsync(dto);

            if (!result.Success)
                return Unauthorized(result.Error);

            // If MFA is required, return challenge instead of JWT
            if (result.MfaRequired)
            {
                return Ok(new
                {
                    MfaRequired = true,
                    MfaToken = result.MfaToken,
                    Message = "MFA verification required. Use POST /api/auth/mfa/verify-login with this MfaToken and your authenticator code."
                });
            }

            // No MFA → return JWT directly (same as before)
            return Ok(new
            {
                Token = result.Token,
                Expiration = result.Expiration,
                User = result.User
            });
        }

        // ══════════════════════════════════════════════
        // MFA ENDPOINTS (ALL NEW)
        // ══════════════════════════════════════════════

        // POST: api/auth/mfa/setup — generates secret key + QR URI
        [Authorize]
        [HttpPost("mfa/setup")]
        public async Task<ActionResult> SetupMfa()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("sub")?.Value!);

            var result = await _service.SetupMfaAsync(userId);

            if (!result.Success)
                return BadRequest(result.Error);

            return Ok(new
            {
                result.Setup!.SecretKey,
                result.Setup.QrCodeUri,
                Instructions = "1. Open Google Authenticator (or any TOTP app). " +
                              "2. Scan the QR code or manually enter the SecretKey. " +
                              "3. Call POST /api/auth/mfa/enable with the 6-digit code to activate MFA."
            });
        }

        // POST: api/auth/mfa/enable — verifies TOTP code and enables MFA
        [Authorize]
        [HttpPost("mfa/enable")]
        public async Task<ActionResult> EnableMfa(MfaVerifyDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("sub")?.Value!);

            var result = await _service.EnableMfaAsync(userId, dto.Code);

            if (!result.Success)
                return BadRequest(result.Error);

            return Ok(new { Message = "MFA has been enabled successfully. You will need your authenticator app for future logins." });
        }

        // POST: api/auth/mfa/disable — verifies TOTP code and disables MFA
        [Authorize]
        [HttpPost("mfa/disable")]
        public async Task<ActionResult> DisableMfa(MfaVerifyDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("sub")?.Value!);

            var result = await _service.DisableMfaAsync(userId, dto.Code);

            if (!result.Success)
                return BadRequest(result.Error);

            return Ok(new { Message = "MFA has been disabled successfully." });
        }

        // POST: api/auth/mfa/verify-login — step 2 of MFA login
        [HttpPost("mfa/verify-login")]
        public async Task<ActionResult> VerifyMfaLogin(MfaLoginVerifyDto dto)
        {
            var result = await _service.VerifyMfaLoginAsync(dto.MfaToken, dto.Code);

            if (!result.Success)
                return Unauthorized(result.Error);

            return Ok(new
            {
                Token = result.Token,
                Expiration = result.Expiration,
                User = result.User
            });
        }
    }
}