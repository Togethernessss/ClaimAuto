using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/policies")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class PoliciesController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllPolicies() { }


        [HttpGet("active")]
        public async Task<IActionResult> GetActivePolicies() { }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetPolicyById(int id) { }


        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreatePolicy(
        [FromBody] CreatePolicyDto dto)
        { }


        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(int id,
        [FromBody] UpdatePolicyDto dto)
        { }



        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivatePolicy(int id) { }
    }
}
