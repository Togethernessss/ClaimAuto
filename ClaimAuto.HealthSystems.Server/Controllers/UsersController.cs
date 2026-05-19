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

namespace ClaimAuto.HealthSystems.Server.Controllers
{   /// <summary>Manages user accounts. Admin only.</summary
    [ApiController]
    [Route("api/users")]
    [Authorize]
    [Produces("application/json")]
    public class UsersController : BaseController
    {

        //Now depends on the INTERFACE — not the database directly
        private readonly IUserRepository _userRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IEmailServices _emailService;
        public UsersController(
                IUserRepository userRepository,
                IAuthRepository authRepository,
                IEmailServices emailService)
        {
                _userRepository = userRepository;
                _authRepository = authRepository;
                _emailService = emailService;
           }

        // GET: api/users 
        /// <summary>Returns all user accounts.</summary>
        /// <response code="200">Returns list of all users.</response>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();

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
                CreatedAt = u.CreatedAt
            });

            return Ok(response);//400
        }

        // GET: api/users/{id}
        /// <summary>Returns a single user by ID.</summary>
        /// <param name="id">The user ID.</param>
        /// <response code="200">Returns the user.</response>
        /// <response code="404">User not found.</response>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponseDto>> GetUser(int id)
        {
            var user = await _userRepository.GetUserByIdAsync(id);
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
                CreatedAt = user.CreatedAt
            });
        }

        // GET: api/users/role/{role}
        /// <summary>Returns all users with the specified role.</summary>
        /// <param name="role">Role to filter by: Admin, InsuranceStaff, Policyholder, Hospital.</param>
        /// <response code="200">Returns list of users with the given role.</response>
        [HttpGet("role/{role}")]      //"role" --> Just a text(static) while {role} is a variable that will be passed in the URL
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsersByRole(UserRole role)
        {
            var users = await _userRepository.GetUsersByRoleAsync(role);

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
                CreatedAt = u.CreatedAt
            });

            return Ok(response);
        }

        // POST: api/users
        /// <summary>Creates a new user account.</summary>
        /// <param name="dto">User details including name, email, password, and role.</param>
        /// <response code="201">User created successfully.</response>
        /// <response code="400">Invalid role.</response>
        /// <response code="409">Email already exists.</response>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
        {
            bool emailExists = await _userRepository.EmailExistsAsync(dto.Email);
            if (emailExists)
                return Conflict("A user with this email already exists.");//409

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");//400

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
                UpdatedAt = DateTime.UtcNow
            };

            // Repository handles ACID transaction internally
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
                CreatedAt = createdUser.CreatedAt
            };

            return CreatedAtAction(nameof(GetUser), new { id = createdUser.UserID }, response);//201
        }

        // POST: api/users/invite
        /// <summary>Admin invites a new user by email. System generates a temp password and emails it.</summary>
        /// <response code="201">Invitation sent successfully.</response>
        /// <response code="400">Invalid role.</response>
        /// <response code="409">Email already exists.</response>
        /// <response code="500">Failed to send invitation email.</response>
        [HttpPost("invite")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserResponseDto>> InviteUser(InviteUserDto dto)
        {
            // 1. Validate inputs
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Name and email are required.");

            if (await _authRepository.EmailExistsAsync(dto.Email))
                return Conflict("A user with this email already exists.");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
                return BadRequest($"Invalid role: {dto.Role}. Valid roles: Admin, InsuranceStaff, Policyholder, Hospital");

            // ─── Multi-tenant: invited user inherits inviting Admin's organization ───
            // Admin's JWT carries their own OrganizationID. We look the Admin up to
            // get it, then assign the same org to the invited user. This enforces
            // tenant isolation — Admins can only invite into their own workspace.
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

            // 2. Generate temp password
            var tempPassword = TempPasswordGenerator.Generate(12);

            // 3. Build user object (repo will hash password + set flag + audit)
            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                Role = role,
                Phone = dto.Phone,
                Department = dto.Department,
                OrganizationID = admin.OrganizationID   // ← inherits Admin's org
            };

            var created = await _authRepository.RegisterInvitedUserAsync(user, tempPassword);

            // 4. Send invitation email (if this throws, the user is created but no email arrives —
            //    we return 500 so the admin knows to manually resend or check SMTP config)
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

            // 5. Return the created user (no password in response, obviously)
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
                CreatedAt = created.CreatedAt
            };

            return CreatedAtAction(nameof(GetUser), new { id = created.UserID }, response);
        }

        // PUT: api/users/{id}
        /// <summary>
        /// Updates a user's profile fields.
        /// Admin can update any user. Non-admin users can update only their own profile
        /// and cannot change their own status or MFA flag through this endpoint.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]   // ← overrides the controller-level Admin-only rule; any logged-in user can hit this
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(int id, UpdateUserDto dto)
        {
            var user = await _userRepository.GetUserByIdAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            // ── Self-update guard ─────────────────────────────────────────
            // Only an Admin can update another user. Non-admins must be editing
            // their own record (id == their own UserID from the JWT).
            var callerId = GetLoggedInUserId();
            var callerRole = GetLoggedInUserRole();
            bool isAdmin = callerRole == "Admin";

            if (!isAdmin && callerId != id)
                return Forbid();   // 403

            // ── Apply allowed updates ────────────────────────────────────
            if (dto.Name != null) user.Name = dto.Name;
            if (dto.Phone != null) user.Phone = dto.Phone;
            if (dto.Department != null) user.Department = dto.Department;

            // Sensitive fields — Admin only
            if (isAdmin)
            {
                if (dto.MFAEnabled.HasValue) user.MFAEnabled = dto.MFAEnabled.Value;
                if (dto.Status != null && Enum.TryParse<AccountStatus>(dto.Status, out var status))
                    user.Status = status;
            }

            await _userRepository.UpdateUserAsync(user);
            return NoContent();
        }

        // DELETE: api/users/{id} — Soft Delete
        /// <summary>Soft-deletes a user by setting their status to Inactive.</summary>
        /// <param name="id">The user ID to deactivate.</param>
        /// <response code="204">User deactivated successfully.</response>
        /// <response code="404">User not found.</response>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var success = await _userRepository.SoftDeleteUserAsync(id);//Making User inactive by setting Status = Inactive, not removing from DB
            if (!success)
                return NotFound($"User with ID {id} not found.");//404

            return NoContent();//204
        }
    }
}