using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
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
        private readonly ApplicationDbContext _context;

        public ClaimsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/claims
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetAllClaims()
        {
            var claims = await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .ToListAsync();

            var response = claims.Select(c => new ClaimResponseDto
            {
                ClaimID = c.ClaimID,
                ExternalClaimRef = c.ExternalClaimRef,
                ProviderID = c.ProviderID,
                ProviderName = c.Provider?.Name ?? "",
                MemberID = c.MemberID,
                MemberName = c.Member?.Name ?? "",
                ClaimType = c.ClaimType.ToString(),
                TotalBilledAmount = c.TotalBilledAmount,
                Status = c.Status.ToString(),
                Priority = c.Priority.ToString(),
                SubmittedAt = c.SubmittedAt
            });

            return Ok(response);
        }

        // GET: api/claims/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClaimResponseDto>> GetClaim(int id)
        {
            var claim = await _context.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .Include(c => c.AdjudicationRecords)
                .Include(c => c.FraudScores)
                .FirstOrDefaultAsync(c => c.ClaimID == id);

            if (claim == null)
                return NotFound($"Claim with ID {id} not found.");

            var response = new ClaimResponseDto
            {
                ClaimID = claim.ClaimID,
                ExternalClaimRef = claim.ExternalClaimRef,
                ProviderID = claim.ProviderID,
                ProviderName = claim.Provider?.Name ?? "",
                MemberID = claim.MemberID,
                MemberName = claim.Member?.Name ?? "",
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                Status = claim.Status.ToString(),
                Priority = claim.Priority.ToString(),
                SubmittedAt = claim.SubmittedAt
            };

            return Ok(response);
        }

        // GET: api/claims/member/7
        [HttpGet("member/{memberId}")]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetClaimsByMember(int memberId)
        {
            var claims = await _context.Claims
                .Where(c => c.MemberID == memberId)
                .Include(c => c.ClaimLines)
                .Include(c => c.Policy)
                .Include(c => c.Member)
                .Include(c => c.Provider)
                .OrderByDescending(c => c.SubmittedAt)
                .ToListAsync();

            var response = claims.Select(c => new ClaimResponseDto
            {
                ClaimID = c.ClaimID,
                ExternalClaimRef = c.ExternalClaimRef,
                ProviderID = c.ProviderID,
                ProviderName = c.Provider?.Name ?? "",
                MemberID = c.MemberID,
                MemberName = c.Member?.Name ?? "",
                ClaimType = c.ClaimType.ToString(),
                TotalBilledAmount = c.TotalBilledAmount,
                Status = c.Status.ToString(),
                Priority = c.Priority.ToString(),
                SubmittedAt = c.SubmittedAt
            });

            return Ok(response);
        }

        // GET: api/claims/status/Submitted
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<ClaimResponseDto>>> GetClaimsByStatus(ClaimStatus status)
        {
            var claims = await _context.Claims
                .Where(c => c.Status == status)
                .Include(c => c.Member)
                .Include(c => c.Provider)
                .OrderBy(c => c.Priority)
                .ThenBy(c => c.SubmittedAt)
                .ToListAsync();

            var response = claims.Select(c => new ClaimResponseDto
            {
                ClaimID = c.ClaimID,
                ExternalClaimRef = c.ExternalClaimRef,
                ProviderID = c.ProviderID,
                ProviderName = c.Provider?.Name ?? "",
                MemberID = c.MemberID,
                MemberName = c.Member?.Name ?? "",
                ClaimType = c.ClaimType.ToString(),
                TotalBilledAmount = c.TotalBilledAmount,
                Status = c.Status.ToString(),
                Priority = c.Priority.ToString(),
                SubmittedAt = c.SubmittedAt
            });

            return Ok(response);
        }

        // POST: api/claims
        [HttpPost]
        [Authorize(Roles = "Hospital")]
        public async Task<ActionResult<ClaimResponseDto>> SubmitClaim(CreateClaimDto dto)
        {
            // Get the logged-in user's ID from JWT token
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                              ?? User.FindFirst("sub");
            int providerID = int.Parse(userIdClaim!.Value);

            if (!string.IsNullOrEmpty(dto.ExternalClaimRef))
            {
                bool duplicate = await _context.Claims
                    .AnyAsync(c => c.ExternalClaimRef == dto.ExternalClaimRef);
                if (duplicate)
                    return Conflict("A claim with this external reference already exists.");
            }

            if (!Enum.TryParse<ClaimType>(dto.ClaimType, true, out var claimType))
                return BadRequest($"Invalid ClaimType: {dto.ClaimType}");

            if (!Enum.TryParse<SourceChannel>(dto.SourceChannel, true, out var sourceChannel))
                sourceChannel = SourceChannel.Portal;

            var claim = new Claim
            {
                MemberID = dto.MemberID,
                PolicyID = dto.PolicyID,
                ProviderID = providerID,
                ClaimType = claimType,
                TotalBilledAmount = dto.TotalBilledAmount,
                Currency = dto.Currency,
                SourceChannel = sourceChannel,
                ExternalClaimRef = dto.ExternalClaimRef,
                SubmittedAt = DateTime.UtcNow,
                ReceivedAt = DateTime.UtcNow,
                Status = ClaimStatus.Submitted,
                Priority = ClaimPriority.Normal
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Claims.Add(claim);
                await _context.SaveChangesAsync();

                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = providerID,
                    Action = "SubmitClaim",
                    ResourceType = "Claim",
                    ResourceID = claim.ClaimID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Load navigation for response
            await _context.Entry(claim).Reference(c => c.Member).LoadAsync();
            await _context.Entry(claim).Reference(c => c.Provider).LoadAsync();

            var response = new ClaimResponseDto
            {
                ClaimID = claim.ClaimID,
                ExternalClaimRef = claim.ExternalClaimRef,
                ProviderID = claim.ProviderID,
                ProviderName = claim.Provider?.Name ?? "",
                MemberID = claim.MemberID,
                MemberName = claim.Member?.Name ?? "",
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                Status = claim.Status.ToString(),
                Priority = claim.Priority.ToString(),
                SubmittedAt = claim.SubmittedAt
            };

            return CreatedAtAction(nameof(GetClaim), new { id = claim.ClaimID }, response);
        }

        // PUT: api/claims/5/status
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
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
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
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

        [HttpGet("{claimId}/lines/{lineId}")]
        public async Task<ActionResult<ClaimLine>> GetClaimLine(int claimId, int lineId)
        {
            var line = await _context.ClaimLines
                .FirstOrDefaultAsync(l => l.ClaimID == claimId && l.LineID == lineId);

            if (line == null)
                return NotFound($"Line {lineId} not found on Claim {claimId}.");

            return Ok(line);
        }

        [HttpPost("{claimId}/lines")]
        [Authorize(Roles = "Hospital")]
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

        [HttpPut("{claimId}/lines/{lineId}")]
        [Authorize(Roles = "Hospital,Admin")]
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

        [HttpDelete("{claimId}/lines/{lineId}")]
        [Authorize(Roles = "Admin")]
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

        [HttpPost("{claimId}/documents")]
        [Authorize(Roles = "Hospital")]
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

        [HttpPut("{claimId}/documents/{docId}/verify")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
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

        [HttpDelete("{claimId}/documents/{docId}")]
        [Authorize(Roles = "Admin")]
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
    }
}