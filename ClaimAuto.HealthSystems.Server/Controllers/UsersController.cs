using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Services;
using ClaimAuto.HealthSystems.Server.Helpers;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages user accounts. Admin only.</summary>
    [ApiController]
    [Route("api/users")]
    [Authorize]
    [Produces("application/json")]
    public class UsersController : BaseController
    {
        private readonly IUserRepository _userRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IEmailServices _emailService;
        private readonly INotificationRepository _notif;
        private readonly ApplicationDbContext _db;

        public UsersController(
            IUserRepository userRepository,
            IAuthRepository authRepository,
            IEmailServices emailService,
            INotificationRepository notif,
            ApplicationDbContext db)
        {
            _userRepository = userRepository;
            _authRepository = authRepository;
            _emailService = emailService;
            _notif = notif;
            _db = db;
        }

        // Best-effort Account-category notification. Failures never break
        // the admin action that just succeeded.
        private async Task SafeNotifyAccountAsync(
            int userId, int? orgId, string message, NotificationSeverity severity)
        {
            try
            {
                await _notif.CreateAsync(new Notification
                {
                    UserID = userId,
                    ClaimID = null,
                    Message = message,
                    Category = NotificationCategory.Account,
                    Severity = severity,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = orgId,
                });
            }
            catch { /* never block the admin action */ }
        }

        /// <summary>Returns all users in the current organisation. Admin only.</summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAllUsers()
        {
            var userOrgId = GetLoggedInUserOrgId();
            var users = await _userRepository.GetAllUsersAsync(userOrgId);

            var response = users.Select(u => new UserResponseDto
            {
                UserID = u.UserID,
                Name = u.Name,
                Role = u.Role.ToString(),
                Email = u.Email,
                Phone = u.Phone,
                Department = u.Department,
                MFAEnabled = u.MFAEnabled,
                Status = u.Status.ToString(),
                CreatedAt = u.CreatedAt,
                IsInNetwork = u.IsInNetwork,
                ProfilePhoto = u.ProfilePhoto
            });

            return Ok(response);
        }

        /// <summary>Returns a single user by ID. Admin only.</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponseDto>> GetUser(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var user = await _userRepository.GetUserByIdAsync(id, userOrgId);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            return Ok(new UserResponseDto
            {
                UserID = user.UserID,
                Name = user.Name,
                Role = user.Role.ToString(),
                Email = user.Email,
                Phone = user.Phone,
                Department = user.Department,
                MFAEnabled = user.MFAEnabled,
                Status = user.Status.ToString(),
                CreatedAt = user.CreatedAt,
                IsInNetwork = user.IsInNetwork,
                ProfilePhoto = user.ProfilePhoto
            });
        }

        /// <summary>Returns all users with a specific role within the organisation. Admin and Staff only.</summary>
        [HttpGet("role/{role}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsersByRole(UserRole role)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var users = await _userRepository.GetUsersByRoleAsync(role, userOrgId);

            var response = users.Select(u => new UserResponseDto
            {
                UserID = u.UserID,
                Name = u.Name,
                Role = u.Role.ToString(),
                Email = u.Email,
                Phone = u.Phone,
                Department = u.Department,
                MFAEnabled = u.MFAEnabled,
                Status = u.Status.ToString(),
                CreatedAt = u.CreatedAt,
                IsInNetwork = u.IsInNetwork,
                ProfilePhoto = u.ProfilePhoto
            });

            return Ok(response);
        }

        /// <summary>Creates a new user with a known password. Returns 409 if the email is already taken. Admin only.</summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
        {
            bool emailExists = await _userRepository.EmailExistsAsync(dto.Email);
            if (emailExists)
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Phone = dto.Phone,
                Department = dto.Department,
                MFAEnabled = dto.MFAEnabled,
                Status = AccountStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OrganizationID = GetLoggedInUserOrgId(),
                IsInNetwork = dto.IsInNetwork,
            };

            var createdUser = await _userRepository.CreateUserAsync(user);

            var response = new UserResponseDto
            {
                UserID = createdUser.UserID,
                Name = createdUser.Name,
                Role = createdUser.Role.ToString(),
                Email = createdUser.Email,
                Phone = createdUser.Phone,
                Department = createdUser.Department,
                MFAEnabled = createdUser.MFAEnabled,
                Status = createdUser.Status.ToString(),
                CreatedAt = createdUser.CreatedAt,
                IsInNetwork = createdUser.IsInNetwork
            };

            return CreatedAtAction(nameof(GetUser), new { id = createdUser.UserID }, response);
        }

        /// <summary>Creates a new user and sends an invitation email with a temporary password. Admin only.</summary>
        [HttpPost("invite")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserResponseDto>> InviteUser(InviteUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Name and email are required.");

            if (await _authRepository.EmailExistsAsync(dto.Email))
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            var adminUserId = GetLoggedInUserId();
            if (adminUserId == null)
                return Unauthorized("Invalid token.");

            var admin = await _authRepository.GetUserByIdAsync(adminUserId.Value);
            if (admin == null)
                return Unauthorized("Inviting admin not found.");

            if (admin.OrganizationID == null)
                return BadRequest(
                    "Your admin account is not linked to an organization. " +
                    "Contact a platform administrator before inviting users.");

            var tempPassword = TempPasswordGenerator.Generate(12);

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                Role = role,
                Phone = dto.Phone,
                Department = dto.Department,
                OrganizationID = admin.OrganizationID,
                IsInNetwork = dto.IsInNetwork,
            };

            var created = await _authRepository.RegisterInvitedUserAsync(user, tempPassword);

            try
            {
                await _emailService.SendInvitationAsync(created.Email, created.Name, tempPassword, created.Role.ToString());
            }
            catch
            {
                return StatusCode(500, new
                {
                    Message = "User created but invitation email could not be sent. Check SMTP configuration.",
                    UserId = created.UserID
                });
            }

            var response = new UserResponseDto
            {
                UserID = created.UserID,
                Name = created.Name,
                Role = created.Role.ToString(),
                Email = created.Email,
                Phone = created.Phone,
                Department = created.Department,
                MFAEnabled = created.MFAEnabled,
                MustChangePassword = created.MustChangePassword,
                Status = created.Status.ToString(),
                CreatedAt = created.CreatedAt,
                IsInNetwork = created.IsInNetwork
            };

            return CreatedAtAction(nameof(GetUser), new { id = created.UserID }, response);
        }

        /// <summary>Updates a user's profile fields. Admins can update any user in the org; non-admins can only update themselves.</summary>
        [HttpPut("{id}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(int id, UpdateUserDto dto)
        {
            var callerId = GetLoggedInUserId();
            var callerRole = GetLoggedInUserRole();
            bool isAdmin = callerRole == "Admin";

            // ── Org-scoped lookup for admins; self-update allowed without org check ──  // ← SaaS FIX
            User? user;                                                                    // ← SaaS FIX
            if (isAdmin)                                                                   // ← SaaS FIX
            {                                                                              // ← SaaS FIX
                user = await _userRepository.GetUserByIdAsync(id, GetLoggedInUserOrgId()); // ← SaaS FIX
            }                                                                              // ← SaaS FIX
            else                                                                           // ← SaaS FIX
            {                                                                              // ← SaaS FIX
                // Non-admin can only update themselves                                    // ← SaaS FIX
                if (callerId != id) return Forbid();                                       // ← SaaS FIX
                user = await _userRepository.GetUserByIdAsync(id);                         // ← SaaS FIX
            }                                                                              // ← SaaS FIX

            if (user == null)
                return NotFound($"User with ID {id} not found.");

            if (!isAdmin && callerId != id)
                return Forbid();

            // ── Snapshot pre-change values for notification triggers ────────────
            // We compare AFTER mutation to determine which Account notifications
            // (if any) should fire. The concern: don't spam on no-op updates.
            var prevStatus = user.Status;
            bool profileFieldChanged =
                (dto.Name       != null && dto.Name       != user.Name) ||
                (dto.Phone      != null && dto.Phone      != user.Phone) ||
                (dto.Department != null && dto.Department != user.Department);

            if (dto.Name != null) user.Name = dto.Name;
            if (dto.Phone != null) user.Phone = dto.Phone;
            if (dto.Department != null) user.Department = dto.Department;

            if (isAdmin)
            {
                if (dto.MFAEnabled.HasValue) user.MFAEnabled = dto.MFAEnabled.Value;
                if (dto.IsInNetwork.HasValue) user.IsInNetwork = dto.IsInNetwork.Value;
                if (dto.Status != null && Enum.TryParse<AccountStatus>(dto.Status, out var status))
                    user.Status = status;
            }

            await _userRepository.UpdateUserAsync(user);

            // ── Account-category notifications (admin updating someone else only) ─
            // Skip when an admin is updating their own profile (`callerId == id`)
            // since they obviously know what they just did.
            if (isAdmin && callerId != id)
            {
                // A6 — Profile updated by admin (only if real content fields changed,
                // NOT on MFA toggle / status / IsInNetwork — those have their own).
                if (profileFieldChanged)
                {
                    var adminName = await _db.Users
                        .Where(u => u.UserID == callerId)
                        .Select(u => u.Name)
                        .FirstOrDefaultAsync() ?? "an administrator";

                    await SafeNotifyAccountAsync(
                        user.UserID, user.OrganizationID,
                        $"Your profile (name / phone / department) was updated by {adminName} " +
                        $"at {DateTime.UtcNow:dd MMM yyyy, hh:mm tt} UTC. " +
                        $"Review your dashboard to confirm the changes.",
                        NotificationSeverity.Info);
                }

                // A7 — Account deactivated (status went Active → Inactive)
                if (prevStatus == AccountStatus.Active && user.Status == AccountStatus.Inactive)
                {
                    var adminName = await _db.Users
                        .Where(u => u.UserID == callerId)
                        .Select(u => u.Name)
                        .FirstOrDefaultAsync() ?? "an administrator";

                    await SafeNotifyAccountAsync(
                        user.UserID, user.OrganizationID,
                        $"Your account has been deactivated by {adminName} " +
                        $"at {DateTime.UtcNow:dd MMM yyyy, hh:mm tt} UTC. " +
                        $"Contact support if this was unexpected.",
                        NotificationSeverity.Critical);
                }
                // A8 — Account reactivated (status went Inactive → Active)
                else if (prevStatus == AccountStatus.Inactive && user.Status == AccountStatus.Active)
                {
                    await SafeNotifyAccountAsync(
                        user.UserID, user.OrganizationID,
                        "Your account has been reactivated. You can now sign in normally.",
                        NotificationSeverity.Info);
                }
            }

            return NoContent();
        }

        /// <summary>Soft-deletes a user, preventing login without removing their data. Admin only.</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(int id)
        {
            // ── Verify user belongs to this org before deleting ──               // ← SaaS FIX
            var user = await _userRepository.GetUserByIdAsync(id, GetLoggedInUserOrgId());  // ← SaaS FIX
            if (user == null)                                                      // ← SaaS FIX
                return NotFound($"User with ID {id} not found.");                 // ← SaaS FIX

            var success = await _userRepository.SoftDeleteUserAsync(id);
            if (!success)
                return NotFound($"User with ID {id} not found.");

            return NoContent();
        }

        /// <summary>Admin toggles a stakeholder's account between Active and Inactive.</summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateUserStatusDto dto)
        {
            if (!Enum.TryParse<AccountStatus>(dto.Status, true, out var newStatus))
                return BadRequest($"Invalid status '{dto.Status}'. Valid values: Active, Inactive.");

            var adminId = GetLoggedInUserId();
            if (adminId == id)
                return BadRequest("You cannot change your own account status.");

            var user = await _userRepository.GetUserByIdAsync(id, GetLoggedInUserOrgId());
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            if (user.Status == newStatus)
                return NoContent();

            user.Status = newStatus;
            await _userRepository.UpdateUserAsync(user);

            var action = newStatus == AccountStatus.Active ? "UserActivated" : "UserDeactivated";
            _db.AuditLogs.Add(new AuditLog
            {
                UserID = adminId!.Value,
                Action = action,
                ResourceType = "User",
                ResourceID = id.ToString(),
                OrganizationID = GetLoggedInUserOrgId(),
                Timestamp = DateTime.UtcNow,
                DetailsJSON = JsonSerializer.Serialize(new
                {
                    targetUserId = id,
                    targetUserName = user.Name,
                    targetUserEmail = user.Email,
                    newStatus = newStatus.ToString()
                })
            });
            await _db.SaveChangesAsync();

            return NoContent();
        }

        // ─── Profile photo ────────────────────────────────────────────────
        // PUT /api/users/{id}/photo
        // Body: { "profilePhoto": "data:image/png;base64,..." }
        // Self-only: the caller must be the same user. Admins are NOT permitted
        // here on purpose — personal photo is a self-service field.
        /// <summary>Replaces the caller's profile photo with a base64 data URL. Self-only — max 2 MB.</summary>
        [HttpPut("{id}/photo")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponseDto>> UpdateProfilePhoto(int id, UpdatePhotoDto dto)
        {
            var callerId = GetLoggedInUserId();
            if (callerId == null || callerId.Value != id)
                return Forbid();

            if (string.IsNullOrWhiteSpace(dto.ProfilePhoto))// Required for PUT since it fully replaces the photo. For PATCH, we might allow null to mean "no change".
                return BadRequest("ProfilePhoto is required.");

            // Must be a data URL of an image type.
            if (!dto.ProfilePhoto.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest("ProfilePhoto must be a data URL (data:image/...).");

            // Defensive size cap — 2 MB binary ≈ ~2.8 MB base64 string. Allow 3 MB
            // for safety. Frontend already enforces 2 MB on the file.
            if (dto.ProfilePhoto.Length > 3_000_000)
                return BadRequest("Photo too large. Max 2 MB.");

            var userOrgId = GetLoggedInUserOrgId();
            var user = await _userRepository.GetUserByIdAsync(id, userOrgId);
            if (user == null) return NotFound();

            user.ProfilePhoto = dto.ProfilePhoto;
            user.UpdatedAt   = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new UserResponseDto
            {
                UserID = user.UserID,
                Name = user.Name,
                Role = user.Role.ToString(),
                Email = user.Email,
                Phone = user.Phone,
                Department = user.Department,
                MFAEnabled = user.MFAEnabled,
                Status = user.Status.ToString(),
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                IsInNetwork = user.IsInNetwork,
                ProfilePhoto = user.ProfilePhoto,
            });
        }

        // DELETE /api/users/{id}/photo — clears the photo. Self-only.
        /// <summary>Clears the caller's profile photo. Self-only.</summary>
        [HttpDelete("{id}/photo")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteProfilePhoto(int id)
        {
            var callerId = GetLoggedInUserId();
            if (callerId == null || callerId.Value != id)
                return Forbid();

            var userOrgId = GetLoggedInUserOrgId();
            var user = await _userRepository.GetUserByIdAsync(id, userOrgId);
            if (user == null) return NotFound();

            user.ProfilePhoto = null;
            user.UpdatedAt    = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}