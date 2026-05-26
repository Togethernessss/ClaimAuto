using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages insurance claims, claim lines, and documents. All authenticated roles.</summary>
    [ApiController]
    [Route("api/claims")]
    [Authorize]
    [Produces("application/json")]
    public class ClaimsController : BaseController
    {
        private readonly IClaimRepository _claimRepo;
        private readonly IAdjudicationRepository _adjRepo;
        private readonly IFraudRepository _fraudRepo;

        public ClaimsController(
            IClaimRepository claimRepo,
            IAdjudicationRepository adjRepo,
            IFraudRepository fraudRepo)
        {
            _claimRepo = claimRepo;
            _adjRepo = adjRepo;
            _fraudRepo = fraudRepo;
        }

        /// <summary>Returns claims visible to the current user. Admins see all; Policyholders see their own.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllClaims(
            [FromQuery] string? status,
            [FromQuery] string? priority,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant scoping

            var claims = await _claimRepo.GetAllClaimsAsync(status, priority, userId, userRole, userOrgId, page, pageSize);
            return Ok(claims);
        }

        /// <summary>Returns a single claim by ID.</summary>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant scoping
            var userRole = GetLoggedInUserRole();
            var userId = GetLoggedInUserId();

            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound($"Claim with ID {id} was not found.");

            // Policyholder: can only view claims where they are the enrolled member
            if (userRole == "Policyholder" && userId.HasValue)
            {
                var myMemberIds = await _claimRepo.GetMemberIdsByPolicyholderAsync(userId.Value, userOrgId);
                if (!myMemberIds.Contains(claim.MemberID))
                    return Forbid();
            }

            // Hospital: can only view claims they submitted
            if (userRole == "Hospital" && userId.HasValue && claim.ProviderID != userId.Value)
                return Forbid();

            return Ok(claim);
        }

        /// <summary>Submits a new insurance claim.</summary>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> SubmitClaim([FromBody] CreateClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping

            if (!string.IsNullOrEmpty(dto.ExternalClaimRef))
            {
                // ★ FIX 2.4 — scope uniqueness check per tenant
                var exists = await _claimRepo.ExternalClaimRefExistsAsync(dto.ExternalClaimRef, userOrgId);
                if (exists)
                    return Conflict($"A claim with ExternalClaimRef '{dto.ExternalClaimRef}' already exists.");
            }

            var created = await _claimRepo.SubmitClaimAsync(dto, userId.Value, userOrgId);
            if (created == null)
                return BadRequest("Validation failed — check that ProviderID (must be Hospital role), " +
                                  "MemberID, and PolicyID (must be Active) all exist and are valid.");


            // ── AUTO FRAUD SCORING + AUTO ADJUDICATION on submission ─────────────────
            var fraudScore = await _fraudRepo.ScoreClaimAsync(created.ClaimID, userOrgId);

            if (fraudScore.ScoreValue >= 70)
            {
                var fraudCase = new FraudCase
                {
                    ClaimID = created.ClaimID,
                    OpenedAt = DateTime.UtcNow,
                    OpenedBy = userId.Value,
                    Priority = FraudCasePriority.High,
                    Status = FraudCaseStatus.Open,
                    InvestigationNotes = $"Auto-opened on submission. Fraud score: {fraudScore.ScoreValue}/100. Factors: {fraudScore.FactorsJSON}",
                    OrganizationID = userOrgId,
                };

                var notification = new Notification
                {
                    UserID = userId.Value,
                    ClaimID = created.ClaimID,
                    Message = $"Fraud alert on CLM-{created.ClaimID}: score {fraudScore.ScoreValue}/100. Claim is blocked pending fraud investigation.",
                    Category = NotificationCategory.Exception,
                    Severity = NotificationSeverity.Critical,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = userOrgId,
                };

                await _fraudRepo.CreateFraudCaseWithNotificationAsync(fraudCase, notification);

                await _claimRepo.UpdateClaimAsync(
                    created.ClaimID,
                    new UpdateClaimDto { Status = "UnderReview" },
                    userId.Value,
                    userOrgId
                );
            }
            else
            {
                var adjResult = await _adjRepo.AutoAdjudicateAsync(created.ClaimID, userOrgId);

                var adjMessage = adjResult?.Decision switch
                {
                    "Denied" => $"CLM-{created.ClaimID} submitted and auto-denied by adjudication engine.",
                    "PendingReview" => $"CLM-{created.ClaimID} submitted and routed to manual review queue.",
                    "Paid" => $"CLM-{created.ClaimID} submitted and approved. Payment created automatically.",
                    "Partial" => $"CLM-{created.ClaimID} submitted and partially approved. Payment created automatically.",
                    _ => $"CLM-{created.ClaimID} submitted successfully."
                };

                return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, new
                {
                    claim = created,
                    fraudDetected = false,
                    autoAdjudicated = true,
                    adjudication = adjResult,
                    message = adjMessage
                });
            }

            return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, new
            {
                claim = created,
                fraudDetected = true,
                autoAdjudicated = false,
                fraudScore = fraudScore.ScoreValue,
                message = $"CLM-{created.ClaimID} submitted but BLOCKED — fraud score {fraudScore.ScoreValue}/100. Claim set to UnderReview pending investigation."
            });
        }

        /// <summary>Updates an existing claim. Admin and InsuranceStaff only.</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateClaim(int id, [FromBody] UpdateClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant scoping

            var updated = await _claimRepo.UpdateClaimAsync(id, dto, userId.Value, userOrgId);
            if (updated == null)
                return NotFound($"Claim with ID {id} was not found.");

            return Ok(updated);
        }

        /// <summary>Permanently deletes a claim. Only Rejected claims can be deleted. Admin only.</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteClaim(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // ★ FIX 2.3 — CRITICAL: tenant ownership check on delete
            var userOrgId = GetLoggedInUserOrgId();
            var result = await _claimRepo.DeleteClaimAsync(id, userId.Value, userOrgId);

            return result switch
            {
                "ok" => Ok($"Claim {id} has been deleted successfully."),
                "notfound" => NotFound($"Claim with ID {id} was not found."),
                "notrejected" => BadRequest($"Cannot delete Claim {id} — only Rejected claims can be deleted."),
                _ => StatusCode(500, "Unexpected error during deletion.")
            };
        }

        /// <summary>Adds a service line item to an existing claim.</summary>
        [HttpPost("{id}/lines")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        /// <summary>Returns all line items for a specific claim.</summary>
        [HttpGet("{id}/lines")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetClaimLines(int id)
        {
            // ★ FIX 2.1 — tenant-scoped read
            var userOrgId = GetLoggedInUserOrgId();
            var lines = await _claimRepo.GetClaimLinesAsync(id, userOrgId);
            return Ok(lines);
        }

        /// <summary>Uploads a supporting document to a claim.</summary>
        [HttpPost("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        /// <summary>Returns all documents attached to a specific claim.</summary>
        [HttpGet("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetClaimDocuments(int id)
        {
            // ★ FIX 2.2 — tenant-scoped read
            var userOrgId = GetLoggedInUserOrgId();
            var docs = await _claimRepo.GetClaimDocumentsAsync(id, userOrgId);
            return Ok(docs);
        }
    }
}