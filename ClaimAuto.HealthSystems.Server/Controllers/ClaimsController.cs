using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ClaimsController : ControllerBase
    {
        private readonly IClaimService _service;

        public ClaimsController(IClaimService service)
        {
            _service = service;
        }

        // GET: api/claims
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetAllClaims()
        {
            var claims = await _service.GetAllAsync();
            return Ok(claims);
        }

        // GET: api/claims/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClaimResponseDto>> GetClaim(int id)
        {
            var claim = await _service.GetByIdAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            return Ok(claim);
        }

        // GET: api/claims/member/7
        [HttpGet("member/{memberId}")]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetClaimsByMember(int memberId)
        {
            var claims = await _service.GetByMemberAsync(memberId);
            return Ok(claims);
        }

        // GET: api/claims/status/Submitted
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetClaimsByStatus(ClaimStatus status)
        {
            var claims = await _service.GetByStatusAsync(status);
            return Ok(claims);
        }

        // POST: api/claims
        [HttpPost]
        [Authorize(Roles = "Hospital")]
        public async Task<ActionResult<ClaimResponseDto>> SubmitClaim(CreateClaimDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int providerID = int.Parse(userIdClaim!.Value);

            var result = await _service.SubmitClaimAsync(dto, providerID);

            if (!result.Success)
            {
                if (result.Error.Contains("already exists"))
                    return Conflict(result.Error);
                return BadRequest(result.Error);
            }

            return CreatedAtAction(nameof(GetClaim), new { id = result.Claim!.ClaimID }, result.Claim);
        }

        // PUT: api/claims/5/status
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> UpdateClaimStatus(int id, [FromBody] ClaimStatus newStatus)
        {
            var result = await _service.UpdateStatusAsync(id, newStatus);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // DELETE: api/claims/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClaim(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // ═══════════════════════════════════════════════════
        //  CLAIM LINES
        // ═══════════════════════════════════════════════════

        [HttpGet("{claimId}/lines")]
        public async Task<ActionResult<IEnumerable<ClaimLine>>> GetClaimLines(int claimId)
        {
            var result = await _service.GetLinesAsync(claimId);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Lines);
        }

        [HttpGet("{claimId}/lines/{lineId}")]
        public async Task<ActionResult<ClaimLine>> GetClaimLine(int claimId, int lineId)
        {
            var result = await _service.GetLineAsync(claimId, lineId);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Line);
        }

        [HttpPost("{claimId}/lines")]
        [Authorize(Roles = "Hospital")]
        public async Task<ActionResult<ClaimLine>> AddClaimLine(int claimId, ClaimLine line)
        {
            var result = await _service.AddLineAsync(claimId, line);
            if (!result.Success)
                return NotFound(result.Error);

            return CreatedAtAction(nameof(GetClaimLine),
                new { claimId, lineId = result.Line!.LineID }, result.Line);
        }

        [HttpPut("{claimId}/lines/{lineId}")]
        [Authorize(Roles = "Hospital,Admin")]
        public async Task<IActionResult> UpdateClaimLine(int claimId, int lineId, ClaimLine updated)
        {
            var result = await _service.UpdateLineAsync(claimId, lineId, updated);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        [HttpDelete("{claimId}/lines/{lineId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClaimLine(int claimId, int lineId)
        {
            var result = await _service.DeleteLineAsync(claimId, lineId);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // ═══════════════════════════════════════════════════
        //  CLAIM DOCUMENTS
        // ═══════════════════════════════════════════════════

        [HttpGet("{claimId}/documents")]
        public async Task<ActionResult<IEnumerable<ClaimDocument>>> GetClaimDocuments(int claimId)
        {
            var result = await _service.GetDocumentsAsync(claimId);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Docs);
        }

        [HttpGet("{claimId}/documents/{docId}")]
        public async Task<ActionResult<ClaimDocument>> GetClaimDocument(int claimId, int docId)
        {
            var result = await _service.GetDocumentAsync(claimId, docId);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Doc);
        }

        [HttpPost("{claimId}/documents")]
        [Authorize(Roles = "Hospital")]
        public async Task<ActionResult<ClaimDocument>> UploadDocument(int claimId, ClaimDocument doc)
        {
            var result = await _service.UploadDocumentAsync(claimId, doc);
            if (!result.Success)
                return NotFound(result.Error);

            return CreatedAtAction(nameof(GetClaimDocument),
                new { claimId, docId = result.Doc!.DocID }, result.Doc);
        }

        [HttpPut("{claimId}/documents/{docId}/verify")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> VerifyDocument(int claimId, int docId,
            [FromBody] int verifiedByUserId)
        {
            var result = await _service.VerifyDocumentAsync(claimId, docId, verifiedByUserId);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        [HttpDelete("{claimId}/documents/{docId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteDocument(int claimId, int docId)
        {
            var result = await _service.DeleteDocumentAsync(claimId, docId);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}