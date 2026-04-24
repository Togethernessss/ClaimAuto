using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/claims")]
    [Authorize]//filters
    public class ClaimsController : BaseController//Abstract base class providing jwt helpers that al controller use
    {
        private readonly IClaimRepository _claimRepo;

        public ClaimsController(IClaimRepository claimRepo)//constructor DI
        {
            _claimRepo = claimRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllClaims(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();

            var claims = await _claimRepo.GetAllClaimsAsync(status, priority, userId, userRole);
            return Ok(claims);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var claim = await _claimRepo.GetClaimByIdAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} was not found.");
            return Ok(claim);
        }

        [HttpPost]
        public async Task<IActionResult> SubmitClaim([FromBody] CreateClaimDto dto)
        {
            var userId = GetLoggedInUserId();//from BaseController
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (!string.IsNullOrEmpty(dto.ExternalClaimRef))
            {
                var exists = await _claimRepo.ExternalClaimRefExistsAsync(dto.ExternalClaimRef);
                if (exists)
                    return Conflict($"A claim with ExternalClaimRef '{dto.ExternalClaimRef}' already exists.");
            }

            var created = await _claimRepo.SubmitClaimAsync(dto, userId.Value);
            if (created == null)
                return BadRequest("Validation failed — check that ProviderID (must be Hospital role), " +
                                  "MemberID, and PolicyID (must be Active) all exist and are valid.");

            return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> UpdateClaim(int id, [FromBody] UpdateClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var updated = await _claimRepo.UpdateClaimAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Claim with ID {id} was not found.");

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClaim(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var result = await _claimRepo.DeleteClaimAsync(id, userId.Value);

            return result switch
            {
                "ok" => Ok($"Claim {id} has been deleted successfully."),
                "notfound" => NotFound($"Claim with ID {id} was not found."),
                "notrejected" => BadRequest($"Cannot delete Claim {id} — only Rejected claims can be deleted."),
                _ => StatusCode(500, "Unexpected error during deletion.")
            };
        }

        [HttpPost("{id}/lines")]
        public async Task<IActionResult> AddClaimLine(int id, [FromBody] AddClaimLineDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var created = await _claimRepo.AddClaimLineAsync(id, dto, userId.Value);
            if (created == null)
                return NotFound($"Claim with ID {id} was not found.");

            return CreatedAtAction(nameof(GetClaimLines), new { id = id }, created);
        }

        [HttpGet("{id}/lines")]
        public async Task<IActionResult> GetClaimLines(int id)
        {
            var lines = await _claimRepo.GetClaimLinesAsync(id);
            return Ok(lines);
        }

        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDocument(int id, [FromBody] UploadDocumentDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var created = await _claimRepo.UploadDocumentAsync(id, dto, userId.Value);
            if (created == null)
                return NotFound($"Claim with ID {id} was not found or user is invalid.");

            return CreatedAtAction(nameof(GetClaimDocuments), new { id = id }, created);
        }

        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetClaimDocuments(int id)
        {
            var docs = await _claimRepo.GetClaimDocumentsAsync(id);
            return Ok(docs);
        }
    }
}