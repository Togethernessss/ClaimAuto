using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Read-only access to organisation data used for registration and dashboard branding.</summary>
    [ApiController]
    [Route("api/organizations")]
    [Produces("application/json")]
    public class OrganizationsController : ControllerBase
    {
        private readonly IOrganizationRepository _orgs;

        public OrganizationsController(IOrganizationRepository orgs)
        {
            _orgs = orgs;
        }

        /// <summary>Returns all organizations a new user can register under.</summary>
        /// <response code="200">List of organizations (may be empty).</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<List<OrganizationResponseDto>>> GetAll()
        {
            var orgs = await _orgs.GetAllAsync();
            return Ok(orgs);
        }

        /// <summary>Returns one organization by ID. Used by the dashboard for branding.</summary>
        /// <response code="200">Organization details.</response>
        /// <response code="404">No organization with that ID.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OrganizationResponseDto>> GetById(int id)
        {
            var org = await _orgs.GetByIdAsync(id);
            if (org == null)
                return NotFound($"Organization {id} not found.");
            return Ok(org);
        }
    }
}