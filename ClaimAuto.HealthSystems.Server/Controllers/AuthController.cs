using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _service;

        public AuthController(IAuthService service)
        {
            _service = service;
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {
            var result = await _service.RegisterAsync(dto);

            if (!result.Success)
            {
                if (result.Error.Contains("already exists"))
                    return Conflict(result.Error);
                return BadRequest(result.Error);
            }

            return CreatedAtAction(nameof(Register), result.User);
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult> Login(LoginDto dto)
        {
            var result = await _service.LoginAsync(dto);

            if (!result.Success)
                return Unauthorized(result.Error);

            return Ok(new
            {
                Token = result.Token,
                Expiration = result.Expiration,
                User = result.User
            });
        }
    }
}
