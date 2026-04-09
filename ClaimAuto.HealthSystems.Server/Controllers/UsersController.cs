using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] string? role,
        [FromQuery] string? status)
        { }



        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id) 
        { }



        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto) 
        { }


        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id,
        [FromBody] UpdateUserDto dto)
        { }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivateUser(int id) 
        { }
    }
}
