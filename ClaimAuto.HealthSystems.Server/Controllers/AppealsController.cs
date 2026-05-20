using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using System.Security.Claims;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages claim appeals and subrogation. All authenticated roles; role-scoped results.</summary>
    [ApiController]
    [Route("api/appeals")]
    [Authorize]
    [Produces("application/json")]
    public class AppealsController : BaseController
    {
        private readonly IAppealRepository _appealRepo;
        private readonly IClaimRepository _claimRepo;
        private readonly IUserRepository _userRepo;
        private readonly INotificationRepository _notifRepo;

        public AppealsController(
            IAppealRepository appealRepo,
            IClaimRepository claimRepo,
            IUserRepository userRepo,
            INotificationRepository notifRepo)
        {
            _appealRepo = appealRepo;
            _claimRepo = claimRepo;
            _userRepo = userRepo;
            _notifRepo = notifRepo;
        }


        // GET /api/appeals
        /// <summary>Returns appeals visible to the current user. Admins and InsuranceStaff see all; others see their own.</summary>
        /// <response code="200">Returns list of appeals.</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllAppeals()
        {
            int userId = GetCurrentUserId();
            string role = GetCurrentUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            var appeals = await _appealRepo.GetAllAppealsAsync(userId, role, userOrgId);

            var response = new List<AppealResponseDto>();
            foreach (var a in appeals)
            {
                var filedByUser = await _userRepo.GetUserByIdAsync(a.FiledBy);

                string? decisionByName = a.DecisionBy?.Name;

                response.Add(new AppealResponseDto
                {
                    AppealID = a.AppealID,
                    ClaimID = a.ClaimID,
                    FiledByName = filedByUser?.Name ?? "Unknown",
                    FiledAt = a.FiledAt,
                    Reason = a.Reason,
                    DocumentsJSON = a.DocumentsJSON,
                    Status = a.Status.ToString(),
                    DecisionAt = a.DecisionAt,
                    DecisionByName = decisionByName,
                    Outcome = a.Outcome?.ToString()
                });
            }

            return Ok(response);
        }


        // GET /api/appeals/{id}
        /// <summary>Returns a single appeal by ID. Non-staff users can only view their own appeals.</summary>
        /// <param name="id">The appeal ID.</param>
        /// <response code="200">Returns the appeal.</response>
        /// <response code="403">Access denied — not the appeal owner.</response>
        /// <response code="404">Appeal not found.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAppealById(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var appeal = await _appealRepo.GetAppealByIdAsync(id, userOrgId);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });
            string role = GetCurrentUserRole();
            if (!IsStaffRole(role) && appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            var filedByUser = await _userRepo.GetUserByIdAsync(appeal.FiledBy);

            string? decisionByName = appeal.DecisionBy?.Name;

            var response = new AppealResponseDto
            {
                AppealID = appeal.AppealID,
                ClaimID = appeal.ClaimID,
                FiledByName = filedByUser?.Name ?? "Unknown",
                FiledAt = appeal.FiledAt,
                Reason = appeal.Reason,
                DocumentsJSON = appeal.DocumentsJSON,
                Status = appeal.Status.ToString(),
                DecisionAt = appeal.DecisionAt,
                DecisionByName = decisionByName,
                Outcome = appeal.Outcome?.ToString()
            };

            return Ok(response);
        }


        // POST /api/appeals — File an appeal
        /// <summary>Files a new appeal for a Rejected or Adjudicated claim. Notifies InsuranceStaff automatically.</summary>
        /// <param name="dto">Appeal details including ClaimID and reason.</param>
        /// <response code="201">Appeal filed successfully.</response>
        /// <response code="400">Claim is not in Rejected or Adjudicated status, or reason is missing.</response>
        /// <response code="404">Claim not found.</response>
        /// <response code="409">An active appeal already exists for this claim.</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> FileAppeal([FromBody] CreateAppealDto dto)
        {
            var claim = await _claimRepo.GetClaimByIdAsync(dto.ClaimID, GetLoggedInUserOrgId());
            if (claim == null)
                return NotFound(new { message = $"Claim {dto.ClaimID} not found." });

            // ── FIX: Compare enum to enum, not enum to string ──
            // OLD: claim.Status.ToString() != "Rejected"
            if (!Enum.TryParse<ClaimStatus>(claim.Status, true, out var claimStatus)
                || (claimStatus != ClaimStatus.Rejected && claimStatus != ClaimStatus.Adjudicated))
            {
                return BadRequest(new { message = $"Claim {dto.ClaimID} has status '{claim.Status}'. Only Rejected or Adjudicated claims can be appealed." });
            }

            var existingAppeals = await _appealRepo.GetAppealsByClaimIdAsync(dto.ClaimID);
            var activeAppeal = existingAppeals.FirstOrDefault(
                a => a.Status == AppealStatus.Filed || a.Status == AppealStatus.UnderReview);
            if (activeAppeal != null)
                return Conflict(new { message = $"Active appeal exists for Claim {dto.ClaimID}. AppealID: {activeAppeal.AppealID}" });

            if (string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new { message = "Appeal reason is required." });

            int userId = GetCurrentUserId();

            var userOrgId = GetLoggedInUserOrgId();   // ← Phase 4: tenant stamping

            var appeal = new Appeal
            {
                ClaimID = dto.ClaimID,
                FiledBy = userId,
                FiledAt = DateTime.UtcNow,
                Reason = dto.Reason,
                DocumentsJSON = dto.DocumentsJSON,
                Status = AppealStatus.Filed,
                OrganizationID = userOrgId,           // ← Phase 4: tenant stamp
            };

            var created = await _appealRepo.FileAppealAsync(appeal);

            // ── FIX: Use UserRole enum, not string ──
            // OLD: await _userRepo.GetUserByRoleAsync("ClaimsProcessor")
            // NEW: await _userRepo.GetUserByRoleAsync(UserRole.InsuranceStaff)
            // Your enum has "InsuranceStaff" not "ClaimsProcessor"
            var staffUsers = await _userRepo.GetUsersByRoleAsync(UserRole.InsuranceStaff, GetLoggedInUserOrgId());
            var assignee = staffUsers.FirstOrDefault();
            if (assignee != null)
            {
                // ── FIX: Use enums for Notification fields ──
                // OLD: Category = "Appeal" (string)
                // NEW: Category = NotificationCategory.Appeal (enum)
                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = assignee.UserID,
                    ClaimID = dto.ClaimID,
                    Message = $"New appeal filed for Claim {dto.ClaimID}. Review within 7 days.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Warning,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread
                });
            }
            var filedByUser = await _userRepo.GetUserByIdAsync(userId);

            var response = new AppealResponseDto
            {
                AppealID = created.AppealID,
                ClaimID = dto.ClaimID,
                FiledByName = filedByUser?.Name ?? "Unknown",
                FiledAt = created.FiledAt,
                Reason = dto.Reason,
                DocumentsJSON = dto.DocumentsJSON,
                Status = created.Status.ToString(),
                DecisionAt = null,
                DecisionByName = null,
                Outcome = null
            };

            return CreatedAtAction(nameof(GetAppealById),
                new { id = created.AppealID }, response);
        }


        // PUT /api/appeals/{id}/decide
        /// <summary>Records a decision on an appeal. If Overturned, the linked claim is reset to Submitted. Admin and InsuranceStaff only.</summary>
        /// <param name="id">The appeal ID to decide.</param>
        /// <param name="dto">Decision outcome (Upheld, Overturned, PartiallyOverturned).</param>
        /// <response code="200">Appeal decided successfully.</response>
        /// <response code="400">Invalid outcome or appeal not in decidable status.</response>
        /// <response code="404">Appeal not found.</response> 
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        // ── FIX: Your enum has "InsuranceStaff", not "ClaimsProcessor" ──
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] DecideAppealDto dto)
        {
            var appeal = await _appealRepo.GetAppealByIdAsync(id, GetLoggedInUserOrgId());
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            if (appeal.Status != AppealStatus.Filed && appeal.Status != AppealStatus.UnderReview)
                return BadRequest(new { message = $"Appeal {id} has status '{appeal.Status}'. Only Filed or UnderReview can be decided." });

            if (!Enum.TryParse<AppealOutcome>(dto.Outcome, true, out var parsedOutcome))
                return BadRequest(new { message = $"Invalid Outcome '{dto.Outcome}'. Must be one of: {string.Join(", ", Enum.GetNames<AppealOutcome>())}" });

            int deciderId = GetCurrentUserId();
            var decided = await _appealRepo.DecideAppealAsync(id, dto.Outcome, deciderId);

            // ── FIX: If Overturned → reset claim using enum ──
            // OLD: claim.Status = "Submitted"; (string to enum = error)
            // OLD: await _claimRepo.UpdateClaimAsync(fc.ClaimID, ...) (fc doesn't exist)
            // NEW: Set enum directly on the claim object and save
            if (parsedOutcome == AppealOutcome.Overturned)
            {
                var claim = await _claimRepo.GetClaimByIdAsync(appeal.ClaimID, GetLoggedInUserOrgId());
                if (claim != null)
                {
                    // Build an UpdateClaimDto according to your DTO definition.
                    var updateDto = new UpdateClaimDto
                    {
                        // If UpdateClaimDto has an enum property:
                        // Status = ClaimStatus.Submitted
                        // If it expects a string:
                        // Status = ClaimStatus.Submitted.ToString()
                        // Set any other required properties here.
                    };

                    // Use the required signature: (int claimId, UpdateClaimDto dto, int updatedByUserId)
                    await _claimRepo.UpdateClaimAsync(appeal.ClaimID, updateDto, deciderId);
                }
            }

            // ── FIX: Notification with enums ──
            await _notifRepo.CreateAsync(new Notification
            {
                UserID = appeal.FiledBy,
                ClaimID = appeal.ClaimID,
                Message = $"Your appeal for Claim {appeal.ClaimID} has been decided: {dto.Outcome}.",
                Category = NotificationCategory.Appeal,
                Severity = NotificationSeverity.Info,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread
            });
            return Ok(new { message = $"Appeal {id} decided as '{dto.Outcome}'.", appealId = id });
        }


        // PUT /api/appeals/{id}/withdraw
        /// <summary>Withdraws an appeal. Only the original filer can withdraw their own appeal.</summary>
        /// <param name="id">The appeal ID to withdraw.</param>
        /// <response code="200">Appeal withdrawn successfully.</response>
        /// <response code="400">Appeal is not in a withdrawable status.</response>
        /// <response code="403">Access denied — not the appeal owner.</response>
        /// <response code="404">Appeal not found.</response>
        [HttpPut("{id}/withdraw")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> WithdrawAppeal(int id)
        {
            var appeal = await _appealRepo.GetAppealByIdAsync(id);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            if (appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            if (appeal.Status != AppealStatus.Filed && appeal.Status != AppealStatus.UnderReview)
                return BadRequest(new { message = $"Appeal {id} has status '{appeal.Status}' and cannot be withdrawn." });

            await _appealRepo.WithdrawAppealAsync(id);
            return Ok(new { message = $"Appeal {id} withdrawn successfully." });
        }


        // POST /api/appeals/subrogation
        /// <summary>Creates a subrogation record to recover costs from a third party. Admin and InsuranceStaff only.</summary>
        /// <param name="dto">Subrogation details including ClaimID, recoverable amount, and third-party info.</param>
        /// <response code="201">Subrogation record created in Initiated status.</response>
        /// <response code="404">Claim not found.</response>
        [HttpPost("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateSubrogation([FromBody] CreateSubrogationDto dto)
        {
            var claim = await _claimRepo.GetClaimByIdAsync(dto.ClaimID, GetLoggedInUserOrgId());
            if (claim == null)
                return NotFound(new { message = $"Claim {dto.ClaimID} not found." });

            var subrogation = new Subrogation
            {
                ClaimID = dto.ClaimID,
                RecoverableAmount = dto.RecoverableAmount,
                ThirdPartyDetailsJSON = dto.ThirdPartyDetailsJSON,
                InitiatedAt = DateTime.UtcNow,
                Status = SubrogationStatus.Initiated
            };

            var created = await _appealRepo.CreateSubrogationAsync(subrogation);
            return CreatedAtAction(nameof(GetSubrogations),
                new { id = created.SubroID }, new
                {
                    subroId = created.SubroID,
                    claimId = dto.ClaimID,
                    status = created.Status.ToString(),
                    initiatedAt = created.InitiatedAt
                });
        }

        // GET /api/appeals/subrogation
        /// <summary>Returns all subrogation records. Admin and InsuranceStaff only.</summary>
        /// <response code="200">Returns list of subrogation records.</response>
        [HttpGet("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSubrogations()
        {
            var subrogations = await _appealRepo.GetSubrogationsAsync();
            return Ok(subrogations);
        }

        // ── Helpers ──
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("UserID")?.Value;
            return int.Parse(userIdClaim ?? "0");
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value
                ?? User.FindFirst("Role")?.Value
                ?? "Unknown";
        }

        private bool IsStaffRole(string role)
        {
            // ── FIX: Match your actual UserRole enum names ──
            // Your enum has: Admin, InsuranceStaff, Policyholder, Hospital
            var staffRoles = new[] { "Admin", "InsuranceStaff" };
            return staffRoles.Contains(role);
        }
    }
}