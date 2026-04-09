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
        {
            throw new NotImplementedException();
        }



        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id) 
        {
            throw new NotImplementedException(); 
        }



        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto) 
        {
            throw new NotImplementedException(); 
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id,
        [FromBody] UpdateUserDto dto)
        {
            throw new NotImplementedException(); 
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivateUser(int id) 
        {
            throw new NotImplementedException(); 
        }
    }
}
