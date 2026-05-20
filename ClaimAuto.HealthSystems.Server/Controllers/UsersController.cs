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

        public UsersController(
            IUserRepository userRepository,
            IAuthRepository authRepository,
            IEmailServices emailService)
        {
            _userRepository = userRepository;
            _authRepository = authRepository;
            _emailService = emailService;
        }

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
                CreatedAt = u.CreatedAt
            });

            return Ok(response);
        }

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
                CreatedAt = user.CreatedAt
            });
        }

        [HttpGet("role/{role}")]
        [Authorize(Roles = "Admin")]
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
                CreatedAt = u.CreatedAt
            });

            return Ok(response);
        }

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
                OrganizationID = GetLoggedInUserOrgId(),                          // ← SaaS FIX
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
                CreatedAt = createdUser.CreatedAt
            };

            return CreatedAtAction(nameof(GetUser), new { id = createdUser.UserID }, response);
        }

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
                OrganizationID = admin.OrganizationID
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
                CreatedAt = created.CreatedAt
            };

            return CreatedAtAction(nameof(GetUser), new { id = created.UserID }, response);
        }

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

            if (dto.Name != null) user.Name = dto.Name;
            if (dto.Phone != null) user.Phone = dto.Phone;
            if (dto.Department != null) user.Department = dto.Department;

            if (isAdmin)
            {
                if (dto.MFAEnabled.HasValue) user.MFAEnabled = dto.MFAEnabled.Value;
                if (dto.Status != null && Enum.TryParse<AccountStatus>(dto.Status, out var status))
                    user.Status = status;
            }

            await _userRepository.UpdateUserAsync(user);
            return NoContent();
        }

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
    }
}