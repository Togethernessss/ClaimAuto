using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/claims")]
    [Authorize]
    public class ClaimsController : BaseController
    {
        private readonly IClaimRepository _claimRepo;

        public ClaimsController(IClaimRepository claimRepo)
        {
            _claimRepo = claimRepo;
        }

        // ── GET /api/claims ──────────────────────────────────────────────
        // Hospital sees only their own claims
        // Policyholder sees only their own claims
        // InsuranceStaff and Admin see all claims
        // Optional filters: ?status=Submitted&priority=High
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

        // ── GET /api/claims/{id} ─────────────────────────────────────────
        // Returns full claim detail — lines, documents, adjudication
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var claim = await _claimRepo.GetClaimByIdAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} was not found.");
            return Ok(claim);
        }

        // ── POST /api/claims ─────────────────────────────────────────────
        // Hospital submits a new claim
        // Validates: ProviderID, MemberID, PolicyID must exist
        // Checks for duplicate ExternalClaimRef
        [HttpPost]
        public async Task<IActionResult> SubmitClaim([FromBody] CreateClaimDto dto)
        {
            // Step 1: Get logged-in user from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // Step 2: Check for duplicate ExternalClaimRef
            if (!string.IsNullOrEmpty(dto.ExternalClaimRef))
            {
                var exists = await _claimRepo.ExternalClaimRefExistsAsync(dto.ExternalClaimRef);
                if (exists)
                    return Conflict($"A claim with ExternalClaimRef '{dto.ExternalClaimRef}' already exists.");
            }

            // Step 3: Submit the claim
            var created = await _claimRepo.SubmitClaimAsync(dto, userId.Value);
            if (created == null)
                return BadRequest("Validation failed — check that ProviderID (must be Hospital role), " +
                                  "MemberID, and PolicyID (must be Active) all exist and are valid.");

            // Step 4: Return 201 Created
            return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, created);
        }

        // ── PUT /api/claims/{id} ─────────────────────────────────────────
        // Staff updates claim status or priority
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> UpdateClaim(int id, [FromBody] CreateClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var updated = await _claimRepo.UpdateClaimAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Claim with ID {id} was not found.");

            return Ok(updated);
        }

        // ── DELETE /api/claims/{id} ──────────────────────────────────────
        // Admin deletes a claim — only allowed for Rejected claims
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

        // ── POST /api/claims/{id}/lines ──────────────────────────────────
        // Adds a line item to an existing claim
        // ClaimID comes from the URL, not from the body
        [HttpPost("{id}/lines")]
        public async Task<IActionResult> AddClaimLine(int id, [FromBody] AddClaimLineDto dto)
        {
            var created = await _claimRepo.AddClaimLineAsync(id, dto);
            if (created == null)
                return NotFound($"Claim with ID {id} was not found.");

            return CreatedAtAction(nameof(GetClaimLines), new { id = id }, created);
        }

        // ── GET /api/claims/{id}/lines ───────────────────────────────────
        // Returns all line items for a claim
        [HttpGet("{id}/lines")]
        public async Task<IActionResult> GetClaimLines(int id)
        {
            var lines = await _claimRepo.GetClaimLinesAsync(id);
            return Ok(lines);
        }

        // ── POST /api/claims/{id}/documents ──────────────────────────────
        // Uploads a supporting document for a claim
        // SHA256 hash sent by client for tamper detection
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

        // ── GET /api/claims/{id}/documents ───────────────────────────────
        // Returns all documents for a claim
        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetClaimDocuments(int id)
        {
            var docs = await _claimRepo.GetClaimDocumentsAsync(id);
            return Ok(docs);
        }
    }
}