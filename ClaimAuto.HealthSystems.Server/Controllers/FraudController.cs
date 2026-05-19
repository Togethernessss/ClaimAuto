using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using System.Security.Claims;

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
       

        public FraudController(
            IFraudRepository fraudRepo,
            IClaimRepository claimRepo,
            IUserRepository userRepo)
        {
            _fraudRepo = fraudRepo;
            _claimRepo = claimRepo;
            _userRepo = userRepo;
        }

        
        // GET /api/fraud/scores/{claimId}
        /// <summary>Returns the fraud score for a specific claim.</summary>
        /// <param name="claimId">The claim ID to retrieve the fraud score for.</param>
        /// <response code="200">Returns the fraud score.</response>
        /// <response code="404">Claim not found or no fraud score exists yet.</response>
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

        // POST /api/fraud/scores/{claimId}
        // Run 4-factor engine → if >= 70 → ACID FraudCase + Notification
        /// <summary>Runs the 4-factor fraud scoring engine on a claim. If score ≥ 70, automatically opens a FraudCase and Critical notification (ACID transaction).</summary>
        /// <param name="claimId">The claim ID to score.</param>
        /// <response code="201">Fraud score calculated successfully.</response>
        /// <response code="404">Claim not found.</response>
        /// <response code="409">Claim has already been scored.</response>
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

            // Run the 4-factor scoring engine
            var fraudScore = await _fraudRepo.ScoreClaimAsync(claimId);

            // If score >= 70 → ACID: create FraudCase + Notification
            int? caseId = null;
            if (fraudScore.ScoreValue >= 70)
            {
                var fraudCase = new FraudCase
                {
                    ClaimID = claimId,
                    OpenedAt = DateTime.UtcNow,
                    OpenedBy = GetCurrentUserId(),
                    Priority = FraudCasePriority.High,      // enum
                    Status = FraudCaseStatus.Open,           // enum
                    InvestigationNotes = $"Auto-opened: fraud score {fraudScore.ScoreValue}. Factors: {fraudScore.FactorsJSON}"
                };

                if (!Enum.TryParse<NotificationCategory>("Exception", true, out var cat))
                    cat = NotificationCategory.Exception; // fallback

                if (!Enum.TryParse<NotificationSeverity>("Critical", true, out var sev))
                    sev = NotificationSeverity.Info;

                if (!Enum.TryParse<NotificationStatus>("Unread", true, out var stat))
                    stat = NotificationStatus.Unread;

                var notification = new Notification
                {
                    UserID = GetCurrentUserId(),
                    ClaimID = claimId,
                    Message = $"High fraud score ({fraudScore.ScoreValue}) on Claim #{claimId}",
                    Category = cat,
                    Severity = sev,
                    CreatedAt = DateTime.UtcNow,
                    Status = stat
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


        // GET /api/fraud/cases
        /// <summary>Returns all fraud cases with optional filters.</summary>
        /// <param name="status">Filter by case status (Open, Resolved).</param>
        /// <param name="priority">Filter by priority (Low, Medium, High).</param>
        /// <response code="200">Returns list of fraud cases.</response>
        [HttpGet("cases")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllFraudCases(
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            // Pass raw strings — repository handles enum parsing
            // Pass raw strings — repository handles enum parsing
            var userOrgId = GetLoggedInUserOrgId();
            var cases = await _fraudRepo.GetAllFraudCasesAsync(status, priority, userOrgId);

            var response = new List<FraudCaseResponseDto>();
            foreach (var fc in cases)
            {
                var openedByUser = await _userRepo.GetUserByIdAsync(fc.OpenedBy);

                response.Add(new FraudCaseResponseDto
                {
                    CaseID = fc.CaseID,
                    ClaimID = fc.ClaimID,
                    OpenedAt = fc.OpenedAt,
                    OpenedByName = openedByUser?.Name ?? "Unknown",
                    Priority = fc.Priority.ToString(),       // enum → string
                    Status = fc.Status.ToString(),           // enum → string
                    InvestigationNotes = fc.InvestigationNotes,
                    EvidenceURIsJSON = fc.EvidenceURIsJSON,
                    ResolvedAt = fc.ResolvedAt,
                    Outcome = fc.Outcome?.ToString()          // nullable enum → string or null
                });
            }

            return Ok(response);
        }


        // GET /api/fraud/cases/{id}
        /// <summary>Returns a single fraud case by its ID.</summary>
        /// <param name="id">The fraud case ID.</param>
        /// <response code="200">Returns the fraud case.</response>
        /// <response code="404">Fraud case not found.</response>
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


        // POST /api/fraud/cases — manually open a case
        ///<summary>Manually opens a fraud case for a claim.</summary>
        /// <param name="dto">Fraud case details including ClaimID, priority, and investigation notes.</param>
        /// <response code="201">Fraud case created successfully.</response>
        /// <response code="400">Invalid priority value.</response>
        /// <response code="404">Claim not found.</response>
        /// <response code="409">A fraud case already exists for this claim.</response>
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

            // Parse Priority string → enum
            if (!Enum.TryParse<FraudCasePriority>(dto.Priority, true, out var parsedPriority))
                return BadRequest(new { message = $"Invalid Priority '{dto.Priority}'. Must be one of: {string.Join(", ", Enum.GetNames<FraudCasePriority>())}" });

            var fraudCase = new FraudCase
            {
                ClaimID = dto.ClaimID,
                OpenedAt = DateTime.UtcNow,
                OpenedBy = GetCurrentUserId(),
                Priority = parsedPriority,                  // enum, not string
                Status = FraudCaseStatus.Open,              // enum
                InvestigationNotes = dto.InvestigationNotes,
                OrganizationID = userOrgId,                 // ← Phase 4: tenant stamp (userOrgId already retrieved on line 232)
            };

            var created = await _fraudRepo.CreateFraudCaseAsync(fraudCase);
            var user = await _userRepo.GetUserByIdAsync(GetCurrentUserId());

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


        // PUT /api/fraud/cases/{id}/resolve
        /// <summary>Resolves a fraud case with an outcome. If outcome is Confirmed, the linked claim is automatically rejected.</summary>
        /// <param name="id">The fraud case ID to resolve.</param>
        /// <param name="dto">Resolution details including outcome (Confirmed, Cleared, Referred).</param>
        /// <response code="200">Fraud case resolved successfully.</response>
        /// <response code="400">Invalid outcome or case already resolved.</response>
        /// <response code="404">Fraud case not found.</response>
        [HttpPut("cases/{id}/resolve")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ResolveFraudCase(int id, [FromBody] ResolveFraudCaseDto dto)
        {
            var fc = await _fraudRepo.GetFraudCaseByIdAsync(id);
            if (fc == null)
                return NotFound(new { message = $"Fraud case {id} not found." });

            if (fc.Status == FraudCaseStatus.Resolved)
                return BadRequest(new { message = $"Fraud case {id} is already resolved." });

            // Validate Outcome string → enum
            if (!Enum.TryParse<FraudOutcome>(dto.Outcome, true, out var parsedOutcome))
                return BadRequest(new { message = $"Invalid Outcome '{dto.Outcome}'. Must be one of: {string.Join(", ", Enum.GetNames<FraudOutcome>())}" });

            var resolved = await _fraudRepo.ResolveFraudCaseAsync(id, dto);

            // If fraud CONFIRMED → reject the claim
            if (parsedOutcome == FraudOutcome.Confirmed)
            {
                var claim = await _claimRepo.GetClaimByIdAsync(fc.ClaimID, GetLoggedInUserOrgId());
                if (claim != null)
                {
                    // Use the repository's UpdateClaimAsync method (existing in IClaimRepository)
                    var updateDto = new UpdateClaimDto
                    {
                        Status = "Rejected"
                    };

                    await _claimRepo.UpdateClaimAsync(fc.ClaimID, updateDto, GetCurrentUserId());
                }
            }

            
            return Ok(new { message = $"Fraud case {id} resolved as '{dto.Outcome}'.", caseId = id });
        }

        // ── Helper ──
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("UserID")?.Value;
            return int.Parse(userIdClaim ?? "0");
        }
    }
}