using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] CreateUserDto dto) 
        {
            throw new NotImplementedException();
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto) 
        {
            throw new NotImplementedException();
        }
    }
}
