using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        public UsersController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
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