using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/claims")]
    [Authorize]   // Any authenticated user — role filtering done inside methods
    public class ClaimsController : BaseController
    {
        // GET /api/claims
        // Hospital sees only their own claims.
        // Policyholder sees only their own claims.
        // InsuranceStaff and Admin see all claims.
        // Filter by Status, Priority.
        // Returns: List<ClaimResponseDto> (summary — no lines/docs)
        [HttpGet]
        public async Task<IActionResult> GetAllClaims(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            throw new NotImplementedException();
        }

        // GET /api/claims/{id}
        // Returns full claim detail — lines, documents, adjudication.
        // Returns: ClaimDetailResponseDto
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaimById(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/claims
        // Hospital submits a claim. Validates Provider, Member, Policy.
        // Status set to Submitted. Timestamps set by server.
        [HttpPost]
        public async Task<IActionResult> SubmitClaim(
            [FromBody] CreateClaimDto dto)
        {
            throw new NotImplementedException();
        }

        // PUT /api/claims/{id}
        // Updates Status and Priority.
        // Logs status change to AuditLog.
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> UpdateClaim(int id,
            [FromBody] CreateClaimDto dto)
        {
            throw new NotImplementedException();
        }

        // DELETE /api/claims/{id}
        // Hard delete — Admin only. Only allowed for Rejected claims.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClaim(int id) 
        {
            throw new NotImplementedException();
        }

        // ── Nested: Claim Lines ───────────────────────────────────

        // POST /api/claims/{id}/lines
        // Adds a line item to an existing claim.
        // ClaimID set from URL — not from body.
        [HttpPost("{id}/lines")]
        public async Task<IActionResult> AddClaimLine(int id,
            [FromBody] AddClaimLineDto dto)
        {
            throw new NotImplementedException(); 
        }

        // GET /api/claims/{id}/lines
        // Returns all line items for a claim.
        [HttpGet("{id}/lines")]
        public async Task<IActionResult> GetClaimLines(int id) 
        {
            throw new NotImplementedException();
        }

        // ── Nested: Claim Documents ───────────────────────────────

        // POST /api/claims/{id}/documents
        // Uploads a supporting document for a claim.
        // SHA256 sent by client, verified by server.
        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDocument(int id,
            [FromBody] UploadDocumentDto dto)
        {
            throw new NotImplementedException();
        }

        // GET /api/claims/{id}/documents
        // Returns all documents for a claim.
        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetClaimDocuments(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
