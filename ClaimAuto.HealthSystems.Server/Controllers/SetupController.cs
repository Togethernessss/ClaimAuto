using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Helpers;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>
    /// Bootstrap endpoints — protected by X-Setup-Key header, no JWT required.
    ///
    /// Typical flow for a new developer:
    ///   1. POST /api/setup/create-org   → creates the organization, returns OrgId
    ///   2. POST /api/setup/create-admin → creates admin for that org, seeds rules + KPIs
    ///   3. POST /api/auth/login         → log in with the admin credentials
    /// </summary>
    [ApiController]
    [Route("api/setup")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class SetupController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<SetupController> _logger;

        public SetupController(
            ApplicationDbContext db,
            IConfiguration config,
            ILogger<SetupController> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 1 — Create Organization
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a new Organization.
        /// Safe to call multiple times — duplicate ShortCode returns 409.
        ///
        /// Header : X-Setup-Key = value from appsettings.json → Setup:SecretKey
        /// Returns: organizationID — pass this to POST /api/setup/create-admin
        /// </summary>
        [HttpPost("create-org")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> CreateOrg(
            [FromHeader(Name = "X-Setup-Key")] string? setupKey,
            [FromBody] SetupCreateOrgDto dto)
        {
            var keyError = ValidateSetupKey(setupKey);
            if (keyError != null) return keyError;

            // ── Validate required fields ─────────────────────────────────────
            if (string.IsNullOrWhiteSpace(dto.OrgName))
                return BadRequest("OrgName is required.");
            if (string.IsNullOrWhiteSpace(dto.ShortCode))
                return BadRequest("ShortCode is required.");

            // ── Duplicate check ──────────────────────────────────────────────
            var shortCodeNorm = dto.ShortCode.Trim().ToUpper();
            if (await _db.Organizations.AnyAsync(o => o.ShortCode == shortCodeNorm))
                return Conflict(
                    $"An organization with ShortCode '{shortCodeNorm}' already exists. " +
                    "Use a different ShortCode or skip this step and create the admin.");

            // ── Create ───────────────────────────────────────────────────────
            var org = new Organization
            {
                Name         = dto.OrgName.Trim(),
                ShortCode    = shortCodeNorm,
                Description  = dto.Description?.Trim(),
                BrandColor   = dto.BrandColor?.Trim(),
                SupportEmail = dto.SupportEmail?.Trim(),
                SupportPhone = dto.SupportPhone?.Trim(),
                CreatedAt    = DateTime.UtcNow,
            };
            _db.Organizations.Add(org);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "[Setup] Organization '{OrgName}' created (ID={OrgID}, ShortCode={ShortCode}).",
                org.Name, org.OrganizationID, org.ShortCode);

            return StatusCode(201, new
            {
                message = $"Organization '{org.Name}' created successfully.",
                organization = new
                {
                    org.OrganizationID,
                    org.Name,
                    org.ShortCode,
                    org.Description,
                    org.BrandColor,
                    org.SupportEmail,
                    org.SupportPhone,
                },
                nextStep = "Call POST /api/setup/create-admin with this organizationID to create the admin user."
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 2 — Create Admin for an existing Organization
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Creates an Admin user for an existing Organization,
        /// then seeds default adjudication rules and KPIs for that org.
        ///
        /// Rules are seeded here (not in create-org) because Rules.CreatedBy
        /// requires a valid UserID — the admin must exist first.
        ///
        /// Header : X-Setup-Key = value from appsettings.json → Setup:SecretKey
        /// Body   : { orgId, adminName, adminEmail, adminPassword }
        /// </summary>
        [HttpPost("create-admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> CreateAdmin(
            [FromHeader(Name = "X-Setup-Key")] string? setupKey,
            [FromBody] SetupCreateAdminDto dto)
        {
            var keyError = ValidateSetupKey(setupKey);
            if (keyError != null) return keyError;

            // ── Validate required fields ─────────────────────────────────────
            if (dto.OrgId <= 0)
                return BadRequest("OrgId is required. Call POST /api/setup/create-org first to get it.");
            if (string.IsNullOrWhiteSpace(dto.AdminName))
                return BadRequest("AdminName is required.");
            if (string.IsNullOrWhiteSpace(dto.AdminEmail))
                return BadRequest("AdminEmail is required.");
            if (string.IsNullOrWhiteSpace(dto.AdminPassword))
                return BadRequest("AdminPassword is required.");

            // ── Validate password policy ─────────────────────────────────────
            var pwError = PasswordPolicy.Validate(dto.AdminPassword);
            if (pwError != null)
                return BadRequest(pwError);

            // ── Verify the org exists ────────────────────────────────────────
            var org = await _db.Organizations.FindAsync(dto.OrgId);
            if (org == null)
                return NotFound(
                    $"Organization with ID {dto.OrgId} not found. " +
                    "Call POST /api/setup/create-org first.");

            // ── Duplicate email check ────────────────────────────────────────
            var emailNorm = dto.AdminEmail.Trim().ToLower();
            if (await _db.Users.AnyAsync(u => u.Email == emailNorm))
                return Conflict(
                    $"A user with email '{emailNorm}' already exists. " +
                    "Use a different email or log in with the existing account.");

            // ── Create Admin user ────────────────────────────────────────────
            var admin = new User
            {
                Name                = dto.AdminName.Trim(),
                Email               = emailNorm,
                Role                = UserRole.Admin,
                PasswordHash        = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                Phone               = dto.AdminPhone?.Trim(),
                Status              = AccountStatus.Active,
                MustChangePassword  = false,
                OrganizationID      = org.OrganizationID,
                IsInNetwork         = true,
                MFAEnabled          = false,
                MFAFailedAttempts   = 0,
                LoginFailedAttempts = 0,
                CreatedAt           = DateTime.UtcNow,
                UpdatedAt           = DateTime.UtcNow,
            };
            _db.Users.Add(admin);
            await _db.SaveChangesAsync();   // save to get UserID before seeding rules

            // ── Seed default rules + KPIs (admin now guaranteed to exist) ────
            await DbSeeder.SeedDefaultRulesForOrgAsync(_db, org.OrganizationID, _logger);
            await DbSeeder.SeedDefaultKPIsForOrgAsync(_db, org.OrganizationID);

            _logger.LogInformation(
                "[Setup] Admin '{AdminEmail}' (UserID={AdminID}) created for " +
                "org '{OrgName}' (ID={OrgID}). Rules and KPIs seeded.",
                admin.Email, admin.UserID, org.Name, org.OrganizationID);

            return StatusCode(201, new
            {
                message = $"Admin '{admin.Email}' created for '{org.Name}'. Default rules and KPIs seeded. You can now log in.",
                organization = new
                {
                    org.OrganizationID,
                    org.Name,
                    org.ShortCode,
                },
                admin = new
                {
                    admin.UserID,
                    admin.Name,
                    admin.Email,
                    role = admin.Role.ToString(),
                },
                nextSteps = new[]
                {
                    "1. Log in          → POST /api/auth/login  { email, password }",
                    "2. Invite Staff    → POST /api/users/invite  { name, email, role: 'InsuranceStaff' }",
                    "3. Invite Hospital → POST /api/users/invite  { name, email, role: 'Hospital', isInNetwork: true }",
                    "4. Policyholders self-register → POST /api/auth/register (public)",
                }
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Private helper — shared setup key validation
        // ─────────────────────────────────────────────────────────────────────
        private IActionResult? ValidateSetupKey(string? providedKey)
        {
            var expectedKey = _config["Setup:SecretKey"];

            if (string.IsNullOrWhiteSpace(expectedKey) ||
                expectedKey == "CHANGE-ME-BEFORE-DEPLOYING")
            {
                return StatusCode(503,
                    "Setup key is not configured on this server. " +
                    "Add 'Setup:SecretKey' to appsettings.Development.json (dev) " +
                    "or environment variables (production).");
            }

            if (string.IsNullOrWhiteSpace(providedKey) || providedKey != expectedKey)
            {
                return Unauthorized(
                    "Invalid or missing X-Setup-Key header. " +
                    "Check the key in your appsettings.Development.json.");
            }

            return null; // key is valid
        }
    }
}
