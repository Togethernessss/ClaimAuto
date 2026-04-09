<<<<<<< HEAD
﻿using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
=======
﻿.using Microsoft.AspNetCore.Http;
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
<<<<<<< HEAD
    [Route("api/[controller]")]
    [ApiController]
    public class ClaimsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClaimsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/claims
        // Returns all claims with their lines and documents
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Claim>>> GetAllClaims()
        {
            var claims = await _context.Claims
                .Include(c => c.ClaimLines)        // JOIN ClaimLines
                .Include(c => c.ClaimDocuments)    // JOIN ClaimDocuments
                .Include(c => c.Member)            // JOIN Member
                .Include(c => c.Policy)            // JOIN Policy
                .ToListAsync();

            return Ok(claims);
        }

        // GET: api/claims/5
        // Returns one claim with full details
        [HttpGet("{id}")]
        public async Task<ActionResult<Claim>> GetClaim(int id)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.AdjudicationRecords)
                .Include(c => c.FraudScores)
                .FirstOrDefaultAsync(c => c.ClaimID == id);

            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            return Ok(claim);
        }

        // GET: api/claims/member/7
        // Returns all claims for a specific member (Policyholder portal)
        [HttpGet("member/{memberId}")]
        public async Task<ActionResult<IEnumerable<Claim>>> GetClaimsByMember(int memberId)
        {
            var claims = await _context.Claims
                .Where(c => c.MemberID == memberId)
                .Include(c => c.ClaimLines)
                .Include(c => c.Policy)
                .OrderByDescending(c => c.SubmittedAt)
                .ToListAsync();

            return Ok(claims);
        }

        // GET: api/claims/status/Submitted
        // Returns claims filtered by status (Insurance Staff exception queue)
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<Claim>>> GetClaimsByStatus(ClaimStatus status)
        {
            var claims = await _context.Claims
                .Where(c => c.Status == status)
                .Include(c => c.Member)
                .Include(c => c.Provider)
                .OrderBy(c => c.Priority)
                .ThenBy(c => c.SubmittedAt)
                .ToListAsync();

            return Ok(claims);
        }

        // POST: api/claims
        // Submits a new claim
        [HttpPost]
        public async Task<ActionResult<Claim>> SubmitClaim(Claim claim)
        {
            // Check for duplicate external reference
            if (!string.IsNullOrEmpty(claim.ExternalClaimRef))
            {
                bool duplicate = await _context.Claims
                    .AnyAsync(c => c.ExternalClaimRef == claim.ExternalClaimRef);

                if (duplicate)
                    return Conflict("A claim with this external reference already exists.");
            }

            claim.SubmittedAt = DateTime.UtcNow;
            claim.ReceivedAt = DateTime.UtcNow;
            claim.Status = ClaimStatus.Submitted;

            _context.Claims.Add(claim);
            await _context.SaveChangesAsync();

            // Audit log
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = claim.ProviderID,
                Action = "SubmitClaim",
                ResourceType = "Claim",
                ResourceID = claim.ClaimID.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClaim), new { id = claim.ClaimID }, claim);
        }

        // PUT: api/claims/5/status
        // Updates claim status (used by adjudication engine and staff)
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateClaimStatus(int id, [FromBody] ClaimStatus newStatus)
        {
            var claim = await _context.Claims.FindAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            claim.Status = newStatus;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/claims/5
        // Hard delete — only Admin should be able to do this
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteClaim(int id)
        {
            var claim = await _context.Claims.FindAsync(id);
            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            _context.Claims.Remove(claim);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ═══════════════════════════════════════════════════
        //  CLAIM LINES  —  /api/claims/{claimId}/lines
        // ═══════════════════════════════════════════════════

        // GET: api/claims/5/lines
        [HttpGet("{claimId}/lines")]
        public async Task<ActionResult<IEnumerable<ClaimLine>>> GetClaimLines(int claimId)
        {
            var claim = await _context.Claims.FindAsync(claimId);
            if (claim == null)
                return NotFound($"Claim with ID {claimId} not found.");

            var lines = await _context.ClaimLines
                .Where(l => l.ClaimID == claimId)
                .ToListAsync();

            return Ok(lines);
        }

        // GET: api/claims/5/lines/3
        [HttpGet("{claimId}/lines/{lineId}")]
        public async Task<ActionResult<ClaimLine>> GetClaimLine(int claimId, int lineId)
        {
            var line = await _context.ClaimLines
                .FirstOrDefaultAsync(l => l.ClaimID == claimId && l.LineID == lineId);

            if (line == null)
                return NotFound($"Line {lineId} not found on Claim {claimId}.");

            return Ok(line);
        }

        // POST: api/claims/5/lines
        [HttpPost("{claimId}/lines")]
        public async Task<ActionResult<ClaimLine>> AddClaimLine(int claimId, ClaimLine line)
        {
            var claim = await _context.Claims.FindAsync(claimId);
            if (claim == null)
                return NotFound($"Claim with ID {claimId} not found.");

            line.ClaimID = claimId;
            _context.ClaimLines.Add(line);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClaimLine),
                new { claimId, lineId = line.LineID }, line);
        }

        // PUT: api/claims/5/lines/3
        [HttpPut("{claimId}/lines/{lineId}")]
        public async Task<IActionResult> UpdateClaimLine(int claimId, int lineId, ClaimLine updated)
        {
            var line = await _context.ClaimLines
                .FirstOrDefaultAsync(l => l.ClaimID == claimId && l.LineID == lineId);

            if (line == null)
                return NotFound($"Line {lineId} not found on Claim {claimId}.");

            line.ServiceCode = updated.ServiceCode;
            line.ServiceDate = updated.ServiceDate;
            line.Quantity = updated.Quantity;
            line.UnitPrice = updated.UnitPrice;
            line.LineBilledAmount = updated.LineBilledAmount;
            line.DiagnosisCodesJSON = updated.DiagnosisCodesJSON;
            line.ProcedureCodesJSON = updated.ProcedureCodesJSON;
            line.LineStatus = updated.LineStatus;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/claims/5/lines/3
        [HttpDelete("{claimId}/lines/{lineId}")]
        public async Task<IActionResult> DeleteClaimLine(int claimId, int lineId)
        {
            var line = await _context.ClaimLines
                .FirstOrDefaultAsync(l => l.ClaimID == claimId && l.LineID == lineId);

            if (line == null)
                return NotFound($"Line {lineId} not found on Claim {claimId}.");

            _context.ClaimLines.Remove(line);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ═══════════════════════════════════════════════════
        //  CLAIM DOCUMENTS  —  /api/claims/{claimId}/documents
        // ═══════════════════════════════════════════════════

        // GET: api/claims/5/documents
        [HttpGet("{claimId}/documents")]
        public async Task<ActionResult<IEnumerable<ClaimDocument>>> GetClaimDocuments(int claimId)
        {
            var claim = await _context.Claims.FindAsync(claimId);
            if (claim == null)
                return NotFound($"Claim with ID {claimId} not found.");

            var docs = await _context.ClaimDocuments
                .Where(d => d.ClaimID == claimId)
                .Include(d => d.Uploader)
                .ToListAsync();

            return Ok(docs);
        }

        // GET: api/claims/5/documents/2
        [HttpGet("{claimId}/documents/{docId}")]
        public async Task<ActionResult<ClaimDocument>> GetClaimDocument(int claimId, int docId)
        {
            var doc = await _context.ClaimDocuments
                .Include(d => d.Uploader)
                .Include(d => d.VerifiedBy)
                .FirstOrDefaultAsync(d => d.ClaimID == claimId && d.DocID == docId);

            if (doc == null)
                return NotFound($"Document {docId} not found on Claim {claimId}.");

            return Ok(doc);
        }

        // POST: api/claims/5/documents
        [HttpPost("{claimId}/documents")]
        public async Task<ActionResult<ClaimDocument>> UploadDocument(int claimId, ClaimDocument doc)
        {
            var claim = await _context.Claims.FindAsync(claimId);
            if (claim == null)
                return NotFound($"Claim with ID {claimId} not found.");

            doc.ClaimID = claimId;
            doc.UploadedAt = DateTime.UtcNow;

            _context.ClaimDocuments.Add(doc);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClaimDocument),
                new { claimId, docId = doc.DocID }, doc);
        }

        // PUT: api/claims/5/documents/2/verify
        [HttpPut("{claimId}/documents/{docId}/verify")]
        public async Task<IActionResult> VerifyDocument(int claimId, int docId,
            [FromBody] int verifiedByUserId)
        {
            var doc = await _context.ClaimDocuments
                .FirstOrDefaultAsync(d => d.ClaimID == claimId && d.DocID == docId);

            if (doc == null)
                return NotFound($"Document {docId} not found on Claim {claimId}.");

            doc.Status = DocStatus.Verified;
            doc.VerifiedByID = verifiedByUserId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/claims/5/documents/2
        [HttpDelete("{claimId}/documents/{docId}")]
        public async Task<IActionResult> DeleteDocument(int claimId, int docId)
        {
            var doc = await _context.ClaimDocuments
                .FirstOrDefaultAsync(d => d.ClaimID == claimId && d.DocID == docId);

            if (doc == null)
                return NotFound($"Document {docId} not found on Claim {claimId}.");

            _context.ClaimDocuments.Remove(doc);
            await _context.SaveChangesAsync();
            return NoContent();
        }
=======
    [ApiController]
    [Route("api/claims")]
    [Authorize]   // Any authenticated user — role filtering done inside methods
    public class ClaimsController : ControllerBase
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
        { }

        // GET /api/claims/{id}
        // Returns full claim detail — lines, documents, adjudication.
        // Returns: ClaimDetailResponseDto
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaimById(int id) { }

        // POST /api/claims
        // Hospital submits a claim. Validates Provider, Member, Policy.
        // Status set to Submitted. Timestamps set by server.
        [HttpPost]
        public async Task<IActionResult> SubmitClaim(
            [FromBody] CreateClaimDto dto)
        { }

        // PUT /api/claims/{id}
        // Updates Status and Priority.
        // Logs status change to AuditLog.
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> UpdateClaim(int id,
            [FromBody] CreateClaimDto dto)
        { }

        // DELETE /api/claims/{id}
        // Hard delete — Admin only. Only allowed for Rejected claims.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteClaim(int id) { }

        // ── Nested: Claim Lines ───────────────────────────────────

        // POST /api/claims/{id}/lines
        // Adds a line item to an existing claim.
        // ClaimID set from URL — not from body.
        [HttpPost("{id}/lines")]
        public async Task<IActionResult> AddClaimLine(int id,
            [FromBody] AddClaimLineDto dto)
        { }

        // GET /api/claims/{id}/lines
        // Returns all line items for a claim.
        [HttpGet("{id}/lines")]
        public async Task<IActionResult> GetClaimLines(int id) { }

        // ── Nested: Claim Documents ───────────────────────────────

        // POST /api/claims/{id}/documents
        // Uploads a supporting document for a claim.
        // SHA256 sent by client, verified by server.
        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDocument(int id,
            [FromBody] UploadDocumentDto dto)
        { }

        // GET /api/claims/{id}/documents
        // Returns all documents for a claim.
        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetClaimDocuments(int id) { }
>>>>>>> 5f6a0f27fddaf865a62cba56c72f3096c4766eef
    }
}
