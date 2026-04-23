using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "Admin")]
    public class UsersController : BaseController
    {

        // ✅ Now depends on the INTERFACE — not the database directly
        private readonly IUserRepository _userRepository;

        public UsersController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // GET: api/users
        [HttpGet]
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
        [HttpGet("{id}")]
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
        [HttpGet("role/{role}")]      //"role" --> Just a text(static) while {role} is a variable that will be passed in the URL
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
        [HttpPost]
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
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, UpdateUserDto dto)
        {
            var user = await _userRepository.GetUserByIdAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            if (dto.Name != null) user.Name = dto.Name;
            if (dto.Phone != null) user.Phone = dto.Phone;
            if (dto.Department != null) user.Department = dto.Department;
            if (dto.MFAEnabled.HasValue) user.MFAEnabled = dto.MFAEnabled.Value;
            if (dto.Status != null && Enum.TryParse<AccountStatus>(dto.Status, out var status))
                user.Status = status;

            await _userRepository.UpdateUserAsync(user);
            return NoContent();
        }

        // DELETE: api/users/{id} — Soft Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var success = await _userRepository.SoftDeleteUserAsync(id);//Making User inactive by setting Status = Inactive, not removing from DB
            if (!success)
                return NotFound($"User with ID {id} not found.");//404

            return NoContent();//204
        }
    }
}