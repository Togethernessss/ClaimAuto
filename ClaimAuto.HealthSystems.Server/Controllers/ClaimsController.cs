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
        private readonly IFraudRepository _fraudRepo;
        private readonly IAdjudicationRepository _adjRepo;

        public ClaimsController(
            IClaimRepository claimRepo,
            IFraudRepository fraudRepo,
            IAdjudicationRepository adjRepo)
        {
            _claimRepo = claimRepo;
            _fraudRepo = fraudRepo;
            _adjRepo = adjRepo;
        }

        /// <summary>Returns claims visible to the current user.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
       public async Task<IActionResult> GetAllClaims(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant scoping

            var claims = await _claimRepo.GetAllClaimsAsync(status, priority, userId, userRole, userOrgId);
            return Ok(claims);
        }

        /// <summary>Returns a single claim by ID.</summary>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant scoping

            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound($"Claim with ID {id} was not found.");
            return Ok(claim);
        }

        /// <summary>
        /// Submits a new insurance claim and immediately runs fraud scoring + auto-adjudication.
        /// Fraud score ≥ 70 → FraudCase opened, claim stays Submitted (blocked).
        /// Fraud score &lt; 70 → adjudication runs automatically.
        /// </summary>
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
                var exists = await _claimRepo.ExternalClaimRefExistsAsync(dto.ExternalClaimRef);
                if (exists)
                    return Conflict($"A claim with ExternalClaimRef '{dto.ExternalClaimRef}' already exists.");
            }

            var created = await _claimRepo.SubmitClaimAsync(dto, userId.Value, userOrgId);
            if (created == null)
                return BadRequest(
                    "Validation failed — check that ProviderID (must be Hospital role), " +
                    "MemberID, and PolicyID (must be Active) all exist and are valid.");

            // ── Add claim lines BEFORE fraud/adjudication ──────────────────
            if (dto.Lines != null && dto.Lines.Any())
            {
                foreach (var line in dto.Lines)
                {
                    await _claimRepo.AddClaimLineAsync(created.ClaimID, line, userId.Value);
                }
            }

            // ── STEP 1: Auto fraud scoring ─────────────────────────────────
            // Only score if not already scored (idempotent guard)
            var existingScore = await _fraudRepo.GetFraudScoreByClaimIdAsync(created.ClaimID);
            if (existingScore == null)
            {
                var fraudScore = await _fraudRepo.ScoreClaimAsync(created.ClaimID);

                if (fraudScore.ScoreValue >= 70)
                {
                    // High fraud risk — block claim, open case, notify staff
                    var fraudCase = new FraudCase
                    {
                        ClaimID = created.ClaimID,
                        OpenedAt = DateTime.UtcNow,
                        OpenedBy = userId.Value,
                        Priority = FraudCasePriority.High,
                        Status = FraudCaseStatus.Open,
                        InvestigationNotes =
                            $"Auto-opened on submission. " +
                            $"Fraud score: {fraudScore.ScoreValue}/100. " +
                            $"Factors: {fraudScore.FactorsJSON}"
                    };

                    var notification = new Notification
                    {
                        UserID = userId.Value,
                        ClaimID = created.ClaimID,
                        Message = $"Fraud alert on CLM-{created.ClaimID}: " +
                                    $"score {fraudScore.ScoreValue}/100. " +
                                    $"Claim is blocked pending fraud investigation.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Critical,
                        CreatedAt = DateTime.UtcNow,
                        Status = NotificationStatus.Unread
                    };

                    await _fraudRepo.CreateFraudCaseWithNotificationAsync(fraudCase, notification);

                    // Return 201 with fraud info — claim exists but is blocked
                    return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, new
                    {
                        claim = created,
                        fraudDetected = true,
                        fraudScore = fraudScore.ScoreValue,
                        message = $"CLM-{created.ClaimID} submitted but BLOCKED — " +
                                        $"fraud score {fraudScore.ScoreValue}/100. " +
                                        $"Fraud case opened for investigation."
                    });
                }

                // ── STEP 2: Auto adjudication (fraud score is clean) ───────
                var adjResult = await _adjRepo.AutoAdjudicateAsync(created.ClaimID);

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

            // Fallback — already scored (should not normally happen on fresh submit)
            return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, created);
        }

        /// <summary>
        /// Updates a claim's PRIORITY only. Status is set automatically by the system.
        /// Admin can additionally override status to Rejected in exceptional cases.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
                public async Task<IActionResult> UpdateClaim(int id, [FromBody] UpdateClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            var userRole = GetLoggedInUserRole();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            // Staff can only change priority.
            // Admin can additionally override status to Rejected.
            if (userRole != "Admin" && !string.IsNullOrEmpty(dto.Status))
                dto = new UpdateClaimDto { Priority = dto.Priority, Status = null };

            var updated = await _claimRepo.UpdateClaimAsync(id, dto, userId.Value);
            if (updated == null)
                return NotFound($"Claim with ID {id} was not found.");

            // ── AUTO FRAUD SCORING + AUTO ADJUDICATION on Validated ──────────────
            if (dto.Status == "Validated")
            {
                var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping (single source for this block)

                // Step 1 — Run fraud scoring (only if not already scored)
                var existingScore = await _fraudRepo.GetFraudScoreByClaimIdAsync(id, userOrgId);
                if (existingScore == null)
                {
                    var fraudScore = await _fraudRepo.ScoreClaimAsync(id);

                    // High risk (≥70) → auto-open fraud case, block adjudication
                    if (fraudScore.ScoreValue >= 70)
                    {
                        var fraudCase = new FraudCase
                        {
                            ClaimID = id,
                            OpenedAt = DateTime.UtcNow,
                            OpenedBy = userId.Value,
                            Priority = FraudCasePriority.High,
                            Status = FraudCaseStatus.Open,
                            InvestigationNotes =
                                $"Auto-opened on validation. " +
                                $"Fraud score: {fraudScore.ScoreValue}/100. " +
                                $"Factors: {fraudScore.FactorsJSON}",
                            OrganizationID = userOrgId,   // ← Phase 4: tenant stamp
                        };

                        var notification = new Notification
                        {
                            UserID = userId.Value,
                            ClaimID = id,
                            Message = $"Fraud alert on CLM-{id}: score {fraudScore.ScoreValue}/100. " +
                                      $"Claim is blocked pending fraud investigation.",
                            Category = NotificationCategory.Exception,
                            Severity = NotificationSeverity.Critical,
                            CreatedAt = DateTime.UtcNow,
                            Status = NotificationStatus.Unread,
                            //OrganizationID = userOrgId,   // ← Phase 4: tenant stamp (if Notification has this field)
                        };

                        await _fraudRepo.CreateFraudCaseWithNotificationAsync(
                            fraudCase, notification);

                        return Ok(new
                        {
                            claim = updated,
                            fraudScore = fraudScore.ScoreValue,
                            fraudDetected = true,
                            autoAdjudicated = false,
                            message = $"CLM-{id} validated but BLOCKED — " +
                                      $"fraud score {fraudScore.ScoreValue}/100. " +
                                      $"Fraud case opened for investigation."
                        });
                    }
                }

                // Step 2 — No fraud (or already scored clean) → run adjudication
                var adjResult = await _adjRepo.AutoAdjudicateAsync(id, userOrgId);   // ← Phase 4: pass tenant
                if (adjResult != null)
                {
                    var message = adjResult.Decision == "PendingReview"
                        ? $"CLM-{id} validated and routed to manual review queue."
                        : $"CLM-{id} validated and auto-adjudicated. Decision: {adjResult.Decision}.";

                    return Ok(new
                    {
                        claim = updated,
                        adjudication = adjResult,
                        fraudDetected = false,
                        autoAdjudicated = true,
                        message
                    });
                }
            }

            return Ok(updated);
        }

        /// <summary>Permanently deletes a claim. Only Rejected claims. Admin only.</summary>
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

            var result = await _claimRepo.DeleteClaimAsync(id, userId.Value);
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

            return CreatedAtAction(nameof(GetClaimLines), new { id }, created);
        }

        /// <summary>Returns all line items for a specific claim.</summary>
        [HttpGet("{id}/lines")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetClaimLines(int id)
        {
            var lines = await _claimRepo.GetClaimLinesAsync(id);
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

            return CreatedAtAction(nameof(GetClaimDocuments), new { id }, created);
        }

        /// <summary>Returns all documents attached to a specific claim.</summary>
        [HttpGet("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetClaimDocuments(int id)
        {
            var docs = await _claimRepo.GetClaimDocumentsAsync(id);
            return Ok(docs);
        }
    }
}