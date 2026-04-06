using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        // GET: api/users/5
        // Returns one user by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound($"User with ID {id} not found.");

            return Ok(user);
        }

        // GET: api/users/role/InsuranceStaff
        // Returns all users of a specific role
        [HttpGet("role/{role}")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersByRole(UserRole role)
        {
            var users = await _context.Users
                .Where(u => u.Role == role && u.Status == AccountStatus.Active)
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/users
        // Creates a new user
        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            // Check if email already exists
            bool emailExists = await _context.Users
                .AnyAsync(u => u.Email == user.Email);

            if (emailExists)
                return Conflict("A user with this email already exists.");

            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Log the action in AuditLog
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = user.UserID,
                Action = "CreateUser",
                ResourceType = "User",
                ResourceID = user.UserID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // 201 Created + location header pointing to GET /api/users/{id}
            return CreatedAtAction(nameof(GetUser), new { id = user.UserID }, user);
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
            return NoContent(); // 204 — success, no body needed
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

