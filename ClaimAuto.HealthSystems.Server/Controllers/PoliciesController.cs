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
        public async Task<IActionResult> GetAllPolicies() 
        {
            throw new NotImplementedException();
        }


        [HttpGet("active")]
        public async Task<IActionResult> GetActivePolicies() 
        {
            throw new NotImplementedException();
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetPolicyById(int id) 
        {
            throw new NotImplementedException();
        }


        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreatePolicy(
        [FromBody] CreatePolicyDto dto)
        {
            throw new NotImplementedException(); 
        }


        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(int id,
        [FromBody] UpdatePolicyDto dto)
        {
            throw new NotImplementedException();
        }



        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivatePolicy(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
