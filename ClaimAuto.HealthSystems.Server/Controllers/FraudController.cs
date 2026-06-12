using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages fraud scoring and fraud case investigation. Admin and InsuranceStaff only.</summary>
    [ApiController]
    [Route("api/fraud")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    [Produces("application/json")]
    public class FraudController : BaseController
    {
        private readonly IFraudRepository _fraudRepo;
        private readonly IClaimRepository _claimRepo;
        private readonly IUserRepository _userRepo;
        private readonly IAdjudicationRepository _adjRepo;

        public FraudController(
            IFraudRepository fraudRepo,
            IClaimRepository claimRepo,
            IUserRepository userRepo,
            IAdjudicationRepository adjRepo)
        {
            _fraudRepo = fraudRepo;
            _claimRepo = claimRepo;
            _userRepo = userRepo;
            _adjRepo = adjRepo;
        }


        /// <summary>Returns the existing fraud score for a claim. Run POST first to generate one.</summary>
        [HttpGet("scores/{claimId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFraudScore(int claimId)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var claim = await _claimRepo.GetClaimByIdAsync(claimId, userOrgId);
            if (claim == null)
                return NotFound(new { message = $"Claim {claimId} not found." });

            var score = await _fraudRepo.GetFraudScoreByClaimIdAsync(claimId, userOrgId);
            if (score == null)
                return NotFound(new { message = $"No fraud score for Claim {claimId}. Run POST /api/fraud/scores/{claimId} first." });

            var response = new FraudScoreResponseDto
            {
                ScoreID = score.ScoreID,
                ClaimID = score.ClaimID,
                ScoringModel = score.ScoringModel,
                ScoreValue = score.ScoreValue,
                FactorsJSON = score.FactorsJSON,
                GeneratedAt = score.GeneratedAt
            };

            return Ok(response);
        }

        /// <summary>Runs the fraud scoring engine on a claim. Automatically opens a High-priority fraud case if score is 70 or above.</summary>
        [HttpPost("scores/{claimId}")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> ScoreClaim(int claimId)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var claim = await _claimRepo.GetClaimByIdAsync(claimId, userOrgId);
            if (claim == null)
                return NotFound(new { message = $"Claim {claimId} not found." });

            var existing = await _fraudRepo.GetFraudScoreByClaimIdAsync(claimId, userOrgId);
            if (existing != null)
                return Conflict(new { message = $"Claim {claimId} already scored. ScoreID: {existing.ScoreID}, Value: {existing.ScoreValue}" });

            var fraudScore = await _fraudRepo.ScoreClaimAsync(claimId, userOrgId);

            int? caseId = null;
            if (fraudScore.ScoreValue >= 70)
            {
                var fraudCase = new FraudCase
                {
                    ClaimID = claimId,
                    OpenedAt = DateTime.UtcNow,
                    OpenedBy = GetLoggedInUserId() ?? 0,
                    Priority = FraudCasePriority.High,
                    Status = FraudCaseStatus.Open,
                    InvestigationNotes = $"Auto-opened: fraud score {fraudScore.ScoreValue}. Factors: {fraudScore.FactorsJSON}",
                    OrganizationID = userOrgId,                          // ← SaaS FIX
                };

                // Auto-opened fraud case → Fraud category (not Exception).
                // Exception is reserved for genuine system/auto-process failures.
                if (!Enum.TryParse<NotificationCategory>("Fraud", true, out var cat))
                    cat = NotificationCategory.Fraud;

                if (!Enum.TryParse<NotificationSeverity>("Critical", true, out var sev))
                    sev = NotificationSeverity.Info;

                if (!Enum.TryParse<NotificationStatus>("Unread", true, out var stat))
                    stat = NotificationStatus.Unread;

                var notification = new Notification
                {
                    UserID = GetLoggedInUserId() ?? 0,
                    ClaimID = claimId,
                    Message = $"High fraud score ({fraudScore.ScoreValue}) on Claim #{claimId}",
                    Category = cat,
                    Severity = sev,
                    CreatedAt = DateTime.UtcNow,
                    Status = stat,
                    OrganizationID = userOrgId
                };

                var createdCase = await _fraudRepo.CreateFraudCaseWithNotificationAsync(
                    fraudCase, notification);
                caseId = createdCase.CaseID;
            }

            var response = new FraudScoreResponseDto
            {
                ScoreID = fraudScore.ScoreID,
                ClaimID = claimId,
                ScoringModel = fraudScore.ScoringModel,
                ScoreValue = fraudScore.ScoreValue,
                FactorsJSON = fraudScore.FactorsJSON,
                GeneratedAt = fraudScore.GeneratedAt
            };

            return CreatedAtAction(nameof(GetFraudScore), new { claimId }, response);
        }


        /// <summary>Returns all fraud cases for the organisation. Optionally filter by status and priority.</summary>
        [HttpGet("cases")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllFraudCases(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var cases = await _fraudRepo.GetAllFraudCasesAsync(status, priority, userOrgId);

            var userIds = cases.Select(fc => fc.OpenedBy).Distinct();
            var usersById = (await _userRepo.GetUsersByIdsAsync(userIds))
                .ToDictionary(u => u.UserID);

            var response = cases.Select(fc => new FraudCaseResponseDto
            {
                CaseID = fc.CaseID,
                ClaimID = fc.ClaimID,
                OpenedAt = fc.OpenedAt,
                OpenedByName = usersById.TryGetValue(fc.OpenedBy, out var u) ? u.Name : "Unknown",
                Priority = fc.Priority.ToString(),
                Status = fc.Status.ToString(),
                InvestigationNotes = fc.InvestigationNotes,
                EvidenceURIsJSON = fc.EvidenceURIsJSON,
                ResolvedAt = fc.ResolvedAt,
                Outcome = fc.Outcome?.ToString()
            }).ToList();

            return Ok(response);
        }


        /// <summary>Returns a single fraud case by ID.</summary>
        [HttpGet("cases/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFraudCaseById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var fc = await _fraudRepo.GetFraudCaseByIdAsync(id, userOrgId);
            if (fc == null)
                return NotFound(new { message = $"Fraud case {id} not found." });

            var openedByUser = await _userRepo.GetUserByIdAsync(fc.OpenedBy);

            var response = new FraudCaseResponseDto
            {
                CaseID = fc.CaseID,
                ClaimID = fc.ClaimID,
                OpenedAt = fc.OpenedAt,
                OpenedByName = openedByUser?.Name ?? "Unknown",
                Priority = fc.Priority.ToString(),
                Status = fc.Status.ToString(),
                InvestigationNotes = fc.InvestigationNotes,
                EvidenceURIsJSON = fc.EvidenceURIsJSON,
                ResolvedAt = fc.ResolvedAt,
                Outcome = fc.Outcome?.ToString()
            };

            return Ok(response);
        }


        /// <summary>Manually opens a fraud case for a claim. Returns 409 if a case already exists for that claim.</summary>
        [HttpPost("cases")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateFraudCase([FromBody] CreateFraudCaseDto dto)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var claim = await _claimRepo.GetClaimByIdAsync(dto.ClaimID, userOrgId);
            if (claim == null)
                return NotFound(new { message = $"Claim {dto.ClaimID} not found." });

            var existingCase = await _fraudRepo.GetFraudCaseByClaimIdAsync(dto.ClaimID, userOrgId);
            if (existingCase != null)
                return Conflict(new { message = $"Fraud case already exists for Claim {dto.ClaimID}. CaseID: {existingCase.CaseID}" });

            if (!Enum.TryParse<FraudCasePriority>(dto.Priority, true, out var parsedPriority))
                return BadRequest(new { message = $"Invalid Priority '{dto.Priority}'. Must be one of: {string.Join(", ", Enum.GetNames<FraudCasePriority>())}" });

            var fraudCase = new FraudCase
            {
                ClaimID = dto.ClaimID,
                OpenedAt = DateTime.UtcNow,
                OpenedBy = GetLoggedInUserId() ?? 0,
                Priority = parsedPriority,
                Status = FraudCaseStatus.Open,
                InvestigationNotes = dto.InvestigationNotes,
                OrganizationID = userOrgId,
            };

            var created = await _fraudRepo.CreateFraudCaseAsync(fraudCase);
            var user = await _userRepo.GetUserByIdAsync(GetLoggedInUserId() ?? 0);

            var response = new FraudCaseResponseDto
            {
                CaseID = created.CaseID,
                ClaimID = dto.ClaimID,
                OpenedAt = created.OpenedAt,
                OpenedByName = user?.Name ?? "Unknown",
                Priority = created.Priority.ToString(),
                Status = created.Status.ToString(),
                InvestigationNotes = dto.InvestigationNotes,
                Outcome = null
            };

            return CreatedAtAction(nameof(GetFraudCaseById), new { id = created.CaseID }, response);
        }


        /// <summary>Resolves a fraud case. Confirmed outcome rejects the claim; Cleared outcome re-adjudicates it.</summary>
        [HttpPut("cases/{id}/resolve")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ResolveFraudCase(int id, [FromBody] ResolveFraudCaseDto dto)
        {
            var fc = await _fraudRepo.GetFraudCaseByIdAsync(id, GetLoggedInUserOrgId());
            if (fc == null)
                return NotFound(new { message = $"Fraud case {id} not found." });

            if (fc.Status == FraudCaseStatus.Resolved)
                return BadRequest(new { message = $"Fraud case {id} is already resolved." });

            if (!Enum.TryParse<FraudOutcome>(dto.Outcome, true, out var parsedOutcome))
                return BadRequest(new { message = $"Invalid Outcome '{dto.Outcome}'. Must be one of: {string.Join(", ", Enum.GetNames<FraudOutcome>())}" });

            var userOrgId = GetLoggedInUserOrgId();
            var resolved = await _fraudRepo.ResolveFraudCaseAsync(id, dto, userOrgId);

            if (parsedOutcome == FraudOutcome.Confirmed)
            {
                var claim = await _claimRepo.GetClaimByIdAsync(fc.ClaimID, userOrgId);
                if (claim != null)
                {
                    var updateDto = new UpdateClaimDto { Status = "Rejected" };
                    await _claimRepo.UpdateClaimAsync(fc.ClaimID, updateDto, GetLoggedInUserId() ?? 0, userOrgId);
                }
            }
            else if (parsedOutcome == FraudOutcome.Cleared)
            {
                var adjResult = await _adjRepo.AutoAdjudicateAsync(fc.ClaimID, userOrgId);
                var adjMessage = adjResult?.Decision switch
                {
                    "Denied"        => $"CLM-{fc.ClaimID} adjudicated and denied by the rules engine.",
                    "PendingReview" => $"CLM-{fc.ClaimID} routed to the manual review queue.",
                    "Paid"          => $"CLM-{fc.ClaimID} approved — payment created automatically.",
                    "Partial"       => $"CLM-{fc.ClaimID} partially approved — payment created automatically.",
                    _               => $"CLM-{fc.ClaimID} adjudicated successfully."
                };

                return Ok(new
                {
                    message = $"Fraud case {id} cleared — {adjMessage}",
                    caseId = id,
                    adjudication = adjResult
                });
            }

            return Ok(new { message = $"Fraud case {id} resolved as '{dto.Outcome}'.", caseId = id });
        }
    }
}