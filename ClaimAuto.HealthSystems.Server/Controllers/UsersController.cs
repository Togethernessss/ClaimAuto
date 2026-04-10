using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {

        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        // Returns all users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAllUsers()
        {
            var users = await _context.Users.ToListAsync();

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

        // GET: api/users/5
        // Returns one user by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound($"User with ID {id} not found.");

            var response = new UserResponseDto
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
            };

            return Ok(response);
        }

        // GET: api/users/role/InsuranceStaff
        // Returns all users of a specific role
        [HttpGet("role/{role}")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsersByRole(UserRole role)
        {
            var users = await _context.Users
                .Where(u => u.Role == role && u.Status == AccountStatus.Active)
                .ToListAsync();

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
        // Creates a new user
        [HttpPost]
        public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
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
                UpdatedAt = DateTime.UtcNow
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = user.UserID,
                    Action = "CreateUser",
                    ResourceType = "User",
                    ResourceID = user.UserID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            var response = new UserResponseDto
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
            };

            return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, response);
        }
        // PUT: api/users/5
        // Updates an existing user
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, User updatedUser)
        {
            if (id != updatedUser.UserID)
                return BadRequest("ID in URL does not match ID in body.");

            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            user.Name = updatedUser.Name;
            user.Phone = updatedUser.Phone;
            user.Department = updatedUser.Department;
            user.MFAEnabled = updatedUser.MFAEnabled;
            user.Status = updatedUser.Status;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }


        // DELETE: api/users/5
        // Soft delete — sets status to Inactive instead of removing
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            user.Status = AccountStatus.Inactive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}