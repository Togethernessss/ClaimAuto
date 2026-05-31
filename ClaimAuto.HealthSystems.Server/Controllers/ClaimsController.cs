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

        /// <summary>Submits a new insurance claim. Hospital and Policyholder only.</summary>
        [HttpPost]
        [Authorize(Roles = "Hospital,Policyholder")]
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
                return BadRequest("Validation failed — check that ProviderID matches your account, " +
                                  "MemberID coverage is active, and PolicyID (must be Active) are all valid.");


            // ── Document verification gate ────────────────────────────────────────────
            // Fraud scoring and adjudication no longer run on submission.
            // The claim is now in DocsVerificationPending — staff must verify all attached
            // documents before triggering adjudication via POST /proceed-to-adjudication.
            // Future: AI document verification service calls this endpoint automatically.
            return CreatedAtAction(nameof(GetClaimById), new { id = created.ClaimID }, new
            {
                claim = created,
                message = $"CLM-{created.ClaimID} submitted and is awaiting document verification by insurance staff."
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

        /// <summary>
        /// Permanently deletes a claim.
        /// Admin: can delete Rejected or Submitted claims.
        /// Hospital: can delete only their own Submitted claims (before staff review).
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Hospital")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteClaim(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userOrgId = GetLoggedInUserOrgId();
            var isHospital = GetLoggedInUserRole() == "Hospital";
            var result = await _claimRepo.DeleteClaimAsync(id, userId.Value, userOrgId, isHospital);

            return result switch
            {
                "ok"         => Ok($"Claim {id} has been deleted successfully."),
                "notfound"   => NotFound($"Claim with ID {id} was not found."),
                "notallowed"    => BadRequest(
                    isHospital
                        ? $"Cannot delete Claim {id}. Hospitals can only delete their own Submitted claims."
                        : $"Cannot delete Claim {id}. Only Submitted or Rejected claims can be deleted."),
                "windowexpired" => BadRequest(
                    $"Cannot delete Claim {id}. The 1-hour edit window has expired. Contact Insurance Staff to make changes."),
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
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadDocument(int id, [FromBody] UploadDocumentDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound($"Claim with ID {id} was not found.");

            // Finalized claims are immutable — their document set is part of the audit trail
            if (claim.Status is "Approved" or "Rejected" or "Paid")
                return BadRequest(
                    $"Cannot upload documents to a {claim.Status} claim. " +
                    "The claim is finalized and its document set is locked.");

            // Hospital/Policyholder: documents can be added while the claim is Submitted
            // or awaiting document verification (DocsVerificationPending).
            // Once staff begins adjudication the document window is closed for non-staff.
            if ((userRole == "Hospital" || userRole == "Policyholder")
                && claim.Status != "Submitted"
                && claim.Status != "DocsVerificationPending")
                return BadRequest(
                    "Documents can only be attached while the claim is awaiting document verification.");

            var created = await _claimRepo.UploadDocumentAsync(id, dto, userId.Value);
            if (created == null)
                return NotFound($"Claim with ID {id} was not found or user is invalid.");

            return CreatedAtAction(nameof(GetClaimDocuments), new { id = id }, created);
        }

        /// <summary>Deletes a document. Enforces ownership and claim-status rules.</summary>
        [HttpDelete("{id}/documents/{docId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteDocument(int id, int docId)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound($"Claim {id} not found.");

            // Finalized claims — document set is sealed
            if (claim.Status is "Approved" or "Rejected" or "Paid")
                return BadRequest(
                    $"Cannot delete documents on a {claim.Status} claim. " +
                    "The claim is finalized.");

            var docs = await _claimRepo.GetClaimDocumentsAsync(id, userOrgId);
            var doc = docs.FirstOrDefault(d => d.DocID == docId);
            if (doc == null)
                return NotFound($"Document {docId} not found on Claim {id}.");

            // Verified documents are part of the audit trail and cannot be removed
            if (doc.Status == "Verified")
                return BadRequest(
                    "Cannot delete a verified document — " +
                    "it has been reviewed and is part of the audit trail.");

            // InsuranceStaff cannot delete documents — Admin only
            if (userRole == "InsuranceStaff")
                return Forbid();

            // Hospital/Policyholder: only their own uploads, only while in the doc-review window
            if (userRole == "Hospital" || userRole == "Policyholder")
            {
                if (claim.Status != "Submitted" && claim.Status != "DocsVerificationPending")
                    return BadRequest(
                        "Documents can only be removed while the claim is awaiting document verification.");
                if (doc.UploadedByID != userId.Value)
                    return Forbid();
            }

            var result = await _claimRepo.DeleteDocumentAsync(id, docId, userId.Value, userOrgId);
            return result switch
            {
                "ok" => Ok($"Document {docId} deleted successfully."),
                "notfound" => NotFound($"Document {docId} not found on Claim {id}."),
                _ => StatusCode(500, "Unexpected error.")
            };
        }

        /// <summary>Marks a document as Verified or Rejected. Admin and InsuranceStaff only.</summary>
        [HttpPut("{id}/documents/{docId}/verify")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> VerifyDocument(
            int id, int docId, [FromBody] VerifyDocumentDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (dto.Status != "Verified" && dto.Status != "Rejected")
                return BadRequest("Status must be 'Verified' or 'Rejected'.");

            var userOrgId = GetLoggedInUserOrgId();

            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound($"Claim {id} not found.");

            if (claim.Status is "Approved" or "Rejected" or "Paid")
                return BadRequest(
                    $"Cannot update documents on a {claim.Status} claim.");

            var result = await _claimRepo.VerifyDocumentAsync(
                id, docId, dto, userId.Value, userOrgId);

            if (result == null)
                return NotFound($"Document {docId} not found on Claim {id}.");

            return Ok(result);
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

        /// <summary>
        /// Triggers fraud scoring and auto-adjudication for a claim that has completed
        /// document verification. Admin and InsuranceStaff only.
        ///
        /// Pre-conditions (enforced by the repository):
        ///   1. Claim must be in DocsVerificationPending status.
        ///   2. No documents on the claim can be in Pending (unreviewed) state.
        ///      Staff must have explicitly Verified or Rejected every document.
        ///
        /// Future extension point: an AI document verification service calls this endpoint
        /// automatically once it has reviewed all documents — no code change required here.
        /// </summary>
        [HttpPost("{id}/proceed-to-adjudication")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ProceedToAdjudication(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            var userOrgId = GetLoggedInUserOrgId();

            // ── Pre-flight validation ────────────────────────────────────────────
            var validation = await _claimRepo.ValidateProceedToAdjudicationAsync(id, userOrgId);
            switch (validation)
            {
                case "notfound":
                    return NotFound($"Claim with ID {id} was not found.");

                case "wrongstatus":
                    return BadRequest(
                        $"Claim {id} is not awaiting document verification. " +
                        "Only claims in 'DocsVerificationPending' status can proceed to adjudication.");

                case "pendingdocs":
                    return BadRequest(
                        $"Claim {id} has one or more unreviewed documents. " +
                        "All documents must be Verified before adjudication can begin.");

                case "rejecteddocs":
                    return BadRequest(
                        $"Claim {id} has rejected documents. " +
                        "The provider must re-upload corrected documents before adjudication can proceed.");

                case "nodocs":
                    return BadRequest(
                        $"Claim {id} has no verified documents. " +
                        "At least one document must be verified before adjudication can proceed.");
            }

            // ── Fraud scoring ────────────────────────────────────────────────────
            // Same engine that previously ran on submission — just runs here instead.
            var fraudScore = await _fraudRepo.ScoreClaimAsync(id, userOrgId);

            if (fraudScore.ScoreValue >= 70)
            {
                // High-risk claim — open a fraud case and block adjudication
                var fraudCase = new FraudCase
                {
                    ClaimID = id,
                    OpenedAt = DateTime.UtcNow,
                    OpenedBy = userId.Value,
                    Priority = FraudCasePriority.High,
                    Status = FraudCaseStatus.Open,
                    InvestigationNotes =
                        $"Auto-opened after document verification. " +
                        $"Fraud score: {fraudScore.ScoreValue}/100. Factors: {fraudScore.FactorsJSON}",
                    OrganizationID = userOrgId,
                };

                var notification = new Notification
                {
                    UserID = userId.Value,
                    ClaimID = id,
                    Message =
                        $"Fraud alert on CLM-{id}: score {fraudScore.ScoreValue}/100. " +
                        "Claim is blocked pending fraud investigation.",
                    Category = NotificationCategory.Fraud,
                    Severity = NotificationSeverity.Critical,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = userOrgId,
                };

                await _fraudRepo.CreateFraudCaseWithNotificationAsync(fraudCase, notification);

                await _claimRepo.UpdateClaimAsync(
                    id,
                    new UpdateClaimDto { Status = "UnderReview" },
                    userId.Value,
                    userOrgId
                );

                return Ok(new
                {
                    claimID = id,
                    fraudDetected = true,
                    autoAdjudicated = false,
                    fraudScore = fraudScore.ScoreValue,
                    message =
                        $"CLM-{id} has a high fraud score ({fraudScore.ScoreValue}/100) " +
                        "and has been moved to manual review."
                });
            }

            // ── Auto-adjudication ────────────────────────────────────────────────
            var adjResult = await _adjRepo.AutoAdjudicateAsync(id, userOrgId);

            var adjMessage = adjResult?.Decision switch
            {
                "Denied" => $"CLM-{id} adjudicated and denied by the rules engine.",
                "PendingReview" => $"CLM-{id} routed to the manual review queue.",
                "Paid" => $"CLM-{id} approved and payment created automatically.",
                "Partial" => $"CLM-{id} partially approved. Payment created automatically.",
                _ => $"CLM-{id} adjudicated successfully."
            };

            return Ok(new
            {
                claimID = id,
                fraudDetected = false,
                autoAdjudicated = true,
                adjudication = adjResult,
                message = adjMessage
            });
        }

        /// <summary>
        /// Staff-initiated rejection of a claim with a documented reason.
        /// Available to Admin and InsuranceStaff for non-finalized claims.
        /// Records reason in audit log + notifies the claim filer.
        /// </summary>
        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> StaffRejectClaim(int id, [FromBody] RejectClaimDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new { message = "Rejection reason is required." });

            if (dto.Reason.Length < 10)
                return BadRequest(new { message = "Rejection reason must be at least 10 characters." });

            var userOrgId = GetLoggedInUserOrgId();
            var result = await _claimRepo.StaffRejectClaimAsync(id, dto.Reason, userId.Value, userOrgId);

            return result switch
            {
                "ok" => Ok(new
                {
                    claimID = id,
                    status = "Rejected",
                    message = $"Claim CLM-{id} has been rejected. Reason: {dto.Reason}"
                }),
                "notfound" => NotFound(new { message = $"Claim {id} not found." }),
                "alreadyfinalized" => BadRequest(new
                {
                    message = $"Claim {id} is already finalized and cannot be rejected again."
                }),
                _ => StatusCode(500, "Unexpected error during rejection.")
            };
        }

        /// <summary>
        /// Replaces a REJECTED document with a corrected version.
        /// Same DocID preserved for audit trail. Status resets to Pending.
        /// Hospital/Policyholder can replace their own; Admin can replace any.
        /// </summary>
        [HttpPost("{id}/documents/{docId}/replace")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ReplaceDocument(
            int id, int docId, [FromBody] ReplaceDocumentDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token — user ID claim missing.");

            if (string.IsNullOrWhiteSpace(dto.FileURI))
                return BadRequest(new { message = "FileURI is required." });

            if (string.IsNullOrWhiteSpace(dto.SHA256))
                return BadRequest(new { message = "SHA256 is required." });

            var userRole = GetLoggedInUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            // ── Verify claim exists + is non-finalized ──
            var claim = await _claimRepo.GetClaimByIdAsync(id, userOrgId);
            if (claim == null)
                return NotFound(new { message = $"Claim {id} not found." });

            if (claim.Status is "Approved" or "Rejected" or "Paid")
                return BadRequest(new
                {
                    message = $"Cannot replace documents on a {claim.Status} claim. " +
                              "The claim is finalized."
                });

            // ── Find the document + verify ownership ──
            var docs = await _claimRepo.GetClaimDocumentsAsync(id, userOrgId);
            var doc = docs.FirstOrDefault(d => d.DocID == docId);
            if (doc == null)
                return NotFound(new { message = $"Document {docId} not found on Claim {id}." });

            // ── Only Rejected docs can be replaced ──
            if (doc.Status != "Rejected")
                return BadRequest(new
                {
                    message = $"Document {docId} has status '{doc.Status}' and cannot be re-uploaded. " +
                              "Only rejected documents can be replaced."
                });

            // ── Hospital/Policyholder can only replace their own ──
            if (userRole == "Hospital" || userRole == "Policyholder")
            {
                if (doc.UploadedByID != userId.Value)
                    return Forbid();
            }

            var result = await _claimRepo.ReplaceDocumentAsync(id, docId, dto, userId.Value, userOrgId);
            if (result == null)
                return NotFound(new
                {
                    message = $"Document {docId} could not be replaced. " +
                              "Confirm it exists and is in Rejected status."
                });

            return Ok(result);
        }
    }
}