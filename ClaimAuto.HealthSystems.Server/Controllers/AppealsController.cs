using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages claim appeals, appeal-document PDFs, and subrogation.</summary>
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
        private readonly IAppealPdfRepository _pdfService;
        private readonly ILogger<AppealsController> _logger;

        public AppealsController(
            IAppealRepository appealRepo,
            IClaimRepository claimRepo,
            IUserRepository userRepo,
            INotificationRepository notifRepo,
            IAppealPdfRepository pdfService,
            ILogger<AppealsController> logger)
        {
            _appealRepo = appealRepo;
            _claimRepo = claimRepo;
            _userRepo = userRepo;
            _notifRepo = notifRepo;
            _pdfService = pdfService;
            _logger = logger;
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns appeals visible to the current user (role-scoped).</summary>
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
                    Outcome = a.Outcome?.ToString(),
                    HasPDF = a.AppealFilePDF != null && a.AppealFilePDF.Length > 0
                });
            }

            return Ok(response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns a single appeal by ID (non-staff see only their own).</summary>
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
                Outcome = appeal.Outcome?.ToString(),
                HasPDF = appeal.AppealFilePDF != null && appeal.AppealFilePDF.Length > 0
            };

            return Ok(response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  POST /api/appeals — File an appeal WITH attached documents
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Files a new appeal for a Rejected/Adjudicated claim. Accepts multipart file uploads.</summary>
        [HttpPost]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> FileAppeal(
            [FromForm] int claimID,
            [FromForm] string reason,
            [FromForm] List<IFormFile>? files)
        {
            // ── Validate claim exists (org-scoped for SaaS) ──
            var claim = await _claimRepo.GetClaimByIdAsync(claimID, GetLoggedInUserOrgId());
            if (claim == null)
                return NotFound(new { message = $"Claim {claimID} not found." });

            // ── Claim must be Rejected or Adjudicated ──
            if (!Enum.TryParse<ClaimStatus>(claim.Status, true, out var claimStatus)
                || (claimStatus != ClaimStatus.Rejected && claimStatus != ClaimStatus.Adjudicated))
            {
                return BadRequest(new
                {
                    message = $"Claim {claimID} has status '{claim.Status}'. Only Rejected or Adjudicated claims can be appealed."
                });
            }

            // ── No duplicate active appeal ──
            var existingAppeals = await _appealRepo.GetAppealsByClaimIdAsync(claimID, GetLoggedInUserOrgId());
            var activeAppeal = existingAppeals.FirstOrDefault(
                a => a.Status == AppealStatus.Filed || a.Status == AppealStatus.UnderReview);
            if (activeAppeal != null)
                return Conflict(new
                {
                    message = $"Active appeal exists for Claim {claimID}. AppealID: {activeAppeal.AppealID}"
                });

            if (string.IsNullOrWhiteSpace(reason))
                return BadRequest(new { message = "Appeal reason is required." });

            int userId = GetCurrentUserId();
            var userOrgId = GetLoggedInUserOrgId();

            // ── Store uploaded file names in DocumentsJSON ──
            string? documentsJSON = null;
            if (files != null && files.Count > 0)
            {
                var fileNames = files.Select(f => f.FileName).ToList();
                documentsJSON = System.Text.Json.JsonSerializer.Serialize(fileNames);
            }

            // ── Create appeal with SaaS tenant stamp ──
            var appeal = new Appeal
            {
                ClaimID = claimID,
                FiledBy = userId,
                FiledAt = DateTime.UtcNow,
                Reason = reason,
                DocumentsJSON = documentsJSON,
                Status = AppealStatus.Filed,
                OrganizationID = userOrgId,       // SaaS tenant stamp
            };

            var created = await _appealRepo.FileAppealAsync(appeal);

            // ── Compile uploaded documents into a single PDF via QuestPDF ──
            if (files != null && files.Count > 0)
            {
                try
                {
                    var filer = await _userRepo.GetUserByIdAsync(userId);
                    created.AppealFilePDF = _pdfService.CompileDocumentsPdf(
                        created,
                        filer?.Name ?? "Unknown",
                        files.ToList());
                    await _appealRepo.UpdateAppealAsync(created);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "PDF generation failed for Appeal {AppealID}. Appeal was saved without a PDF.",
                        created.AppealID);
                    // Non-fatal — appeal is still filed, PDF just missing
                }
            }

            // ── Notify InsuranceStaff in the same org ──
            var staffUsers = await _userRepo.GetUsersByRoleAsync(UserRole.InsuranceStaff, userOrgId);
            var assignee = staffUsers.FirstOrDefault();
            if (assignee != null)
            {
                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = assignee.UserID,
                    ClaimID = claimID,
                    Message = $"New appeal filed for Claim {claimID}. Review within 7 days.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Warning,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = userOrgId,
                });
            }

            var filedByUser = await _userRepo.GetUserByIdAsync(userId);

            var response = new AppealResponseDto
            {
                AppealID = created.AppealID,
                ClaimID = claimID,
                FiledByName = filedByUser?.Name ?? "Unknown",
                FiledAt = created.FiledAt,
                Reason = reason,
                DocumentsJSON = documentsJSON,
                Status = created.Status.ToString(),
                DecisionAt = null,
                DecisionByName = null,
                Outcome = null,
                HasPDF = created.AppealFilePDF != null && created.AppealFilePDF.Length > 0
            };

            return CreatedAtAction(nameof(GetAppealById),
                new { id = created.AppealID }, response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/pdf — Download compiled documents PDF
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Downloads the compiled appeal documents PDF.</summary>
        [HttpGet("{id}/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAppealPdf(int id)
        {
            var appeal = await _appealRepo.GetAppealByIdAsync(id, GetLoggedInUserOrgId());
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            string role = GetCurrentUserRole();
            if (!IsStaffRole(role) && appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            if (appeal.AppealFilePDF == null || appeal.AppealFilePDF.Length == 0)
                return NotFound(new { message = $"No documents PDF for Appeal {id}." });

            return File(appeal.AppealFilePDF, "application/pdf", $"Appeal-APL-{id}-Documents.pdf");
        }


        // ═══════════════════════════════════════════════════════════════
        //  PUT /api/appeals/{id}/decide — Admin/Staff decide an appeal
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Records a decision. If Overturned, the linked claim resets to Submitted.</summary>
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] DecideAppealDto dto)
        {
            var appeal = await _appealRepo.GetAppealByIdAsync(id, GetLoggedInUserOrgId());
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            if (appeal.Status != AppealStatus.Filed && appeal.Status != AppealStatus.UnderReview)
                return BadRequest(new
                {
                    message = $"Appeal {id} has status '{appeal.Status}'. Only Filed or UnderReview can be decided."
                });

            if (!Enum.TryParse<AppealOutcome>(dto.Outcome, true, out var parsedOutcome))
                return BadRequest(new
                {
                    message = $"Invalid Outcome '{dto.Outcome}'. Must be one of: {string.Join(", ", Enum.GetNames<AppealOutcome>())}"
                });

            int deciderId = GetCurrentUserId();
            var decided = await _appealRepo.DecideAppealAsync(id, dto.Outcome, deciderId);

            // If Overturned → reset the linked claim back to Submitted
            if (parsedOutcome == AppealOutcome.Overturned)
            {
                var claim = await _claimRepo.GetClaimByIdAsync(appeal.ClaimID, GetLoggedInUserOrgId());
                if (claim != null)
                {
                    var updateDto = new UpdateClaimDto
                    {
                        Status = ClaimStatus.Submitted.ToString()
                    };
                    await _claimRepo.UpdateClaimAsync(appeal.ClaimID, updateDto, deciderId, GetLoggedInUserOrgId());
                }
            }

            // Notify the appeal filer about the decision
            await _notifRepo.CreateAsync(new Notification
            {
                UserID = appeal.FiledBy,
                ClaimID = appeal.ClaimID,
                Message = $"Your appeal for Claim {appeal.ClaimID} has been decided: {dto.Outcome}.",
                Category = NotificationCategory.Appeal,
                Severity = NotificationSeverity.Info,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = GetLoggedInUserOrgId(),
            });

            return Ok(new { message = $"Appeal {id} decided as '{dto.Outcome}'.", appealId = id });
        }


        // ═══════════════════════════════════════════════════════════════
        //  PUT /api/appeals/{id}/withdraw — Filer withdraws own appeal
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Withdraws an appeal. Only the original filer can withdraw.</summary>
        [HttpPut("{id}/withdraw")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> WithdrawAppeal(int id)
        {
            var appeal = await _appealRepo.GetAppealByIdAsync(id, GetLoggedInUserOrgId());
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            if (appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            if (appeal.Status != AppealStatus.Filed && appeal.Status != AppealStatus.UnderReview)
                return BadRequest(new { message = $"Appeal {id} has status '{appeal.Status}' and cannot be withdrawn." });

            await _appealRepo.WithdrawAppealAsync(id);
            return Ok(new { message = $"Appeal {id} withdrawn successfully." });
        }


        // ═══════════════════════════════════════════════════════════════
        //  POST /api/appeals/subrogation — Create subrogation record
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Creates a subrogation record to recover costs from a third party.</summary>
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
                Status = SubrogationStatus.Initiated,
                OrganizationID = GetLoggedInUserOrgId()    // ← SaaS FIX
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


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/subrogation — List all subrogation records
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns all subrogation records (Admin/InsuranceStaff only).</summary>
        [HttpGet("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSubrogations()
        {
            var subrogations = await _appealRepo.GetSubrogationsAsync(GetLoggedInUserOrgId());
            return Ok(subrogations);
        }


        // ═══════════════════════════════════════════════════════════════
        //  Helpers
        // ═══════════════════════════════════════════════════════════════
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
            var staffRoles = new[] { "Admin", "InsuranceStaff" };
            return staffRoles.Contains(role);
        }
    }
}