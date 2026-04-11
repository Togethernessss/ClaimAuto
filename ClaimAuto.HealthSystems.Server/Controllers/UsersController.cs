using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _service;

        public UsersController(IUserService service)
        {
            _service = service;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAllUsers()
        {
            var users = await _service.GetAllAsync();
            return Ok(users);
        }

        // GET: api/users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetUser(int id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null)
                return NotFound($"User with ID {id} not found.");

            return Ok(user);
        }

        // GET: api/users/role/InsuranceStaff
        [HttpGet("role/{role}")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsersByRole(UserRole role)
        {
            var users = await _service.GetByRoleAsync(role);
            return Ok(users);
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<UserResponseDto>> CreateUser(CreateUserDto dto)
        {
            var result = await _service.CreateAsync(dto);

            if (!result.Success)
            {
                if (result.Error.Contains("already exists"))
                    return Conflict(result.Error);
                return BadRequest(result.Error);
            }

            return CreatedAtAction(nameof(GetUser), new { id = result.User!.UserID }, result.User);
        }

        // PUT: api/users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, User updatedUser)
        {
            var result = await _service.UpdateAsync(id, updatedUser);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return NoContent();
        }

        // DELETE: api/users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}
