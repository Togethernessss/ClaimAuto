using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UserController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST /api/user
        // Now Swagger only shows: Name, Role, Email, Phone, Department,
        // MFAEnabled, Status — clean and simple
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] UserDto dto)
        {
            // Parse the Role string into the enum
            // Enum.TryParse converts "Policyholder" string → UserRole.Policyholder
            if (!Enum.TryParse<UserRole>(dto.Role, out var role))
                return BadRequest($"Invalid role: {dto.Role}. " +
                    "Valid options: Admin, InsuranceStaff, Policyholder, Hospital");

            if (!Enum.TryParse<AccountStatus>(dto.Status, out var status))
                return BadRequest($"Invalid status: {dto.Status}. " +
                    "Valid options: Active, Inactive");

            // Check email uniqueness before trying to save
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return BadRequest($"Email {dto.Email} is already registered.");

            // Map DTO → actual User model
            // We fill in the fields the user didn't send
            var user = new User
            {
                Name = dto.Name,
                Role = role,
                Email = dto.Email,
                Phone = dto.Phone,
                Department = dto.Department,
                MFAEnabled = dto.MFAEnabled,
                Status = status,
                CreatedAt = DateTime.UtcNow,  // auto-set
                UpdatedAt = DateTime.UtcNow   // auto-set
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUserById),
                new { id = user.UserID }, user);
        }

        // GET /api/user
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        // GET /api/user/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");
            return Ok(user);
        }
    }
}