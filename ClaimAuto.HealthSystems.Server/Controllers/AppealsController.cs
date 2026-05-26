using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>
    /// Manages claim appeals, appeal-document storage, decisions, and subrogation.
    /// Multi-tenant: every read and write is scoped by the user's OrganizationID
    /// extracted from the JWT.
    /// </summary>
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
        //  GET /api/appeals  — list all appeals visible to this user
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns appeals visible to the current user (org + role scoped).</summary>
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
        //  GET /api/appeals/{id}  — single appeal by ID
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns a single appeal by ID. Non-staff users see only their own.</summary>
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
        /// <summary>
        /// Files a new appeal for a Rejected/Adjudicated claim. Accepts multipart file uploads.
        /// Each file is saved as an AppealDocument (originals preserved) AND compiled into a
        /// single PDF for the combined view.
        /// </summary>
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

            // ════════════════════════════════════════════════════════════
            //  *** KEY: pre-read all files into memory ONCE ***
            //  IFormFile streams can only be read once. We need bytes for
            //  BOTH AppealDocuments storage AND PDF compilation, so we
            //  cache them up front and reuse them.
            // ════════════════════════════════════════════════════════════
            var cachedFiles = new List<(string Name, string ContentType, byte[] Data)>();
            if (files != null && files.Count > 0)
            {
                foreach (var file in files)
                {
                    if (file.Length == 0) continue;

                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);

                    cachedFiles.Add((
                        Name: file.FileName,
                        ContentType: string.IsNullOrEmpty(file.ContentType)
                            ? "application/octet-stream"
                            : file.ContentType,
                        Data: ms.ToArray()
                    ));
                }
            }

            // ── Store uploaded file names in DocumentsJSON ──
            string? documentsJSON = null;
            if (cachedFiles.Count > 0)
            {
                var fileNames = cachedFiles.Select(f => f.Name).ToList();
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
                OrganizationID = userOrgId,
            };

            var created = await _appealRepo.FileAppealAsync(appeal);

            // ── Save each ORIGINAL file as an AppealDocument row ──
            if (cachedFiles.Count > 0)
            {
                var docs = cachedFiles.Select(cf => new AppealDocument
                {
                    AppealID = created.AppealID,
                    FileName = cf.Name,
                    ContentType = cf.ContentType,
                    FileSize = cf.Data.Length,
                    FileData = cf.Data,
                    UploadedAt = DateTime.UtcNow,
                    OrganizationID = userOrgId,
                }).ToList();

                try
                {
                    await _appealRepo.SaveAppealDocumentsAsync(created.AppealID, docs);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Saving AppealDocuments failed for Appeal {AppealID}. Appeal was saved without original files.",
                        created.AppealID);
                    // Non-fatal — appeal is still filed
                }
            }

            // ── Compile combined PDF using cached bytes (recreated FormFile wrappers) ──
            if (cachedFiles.Count > 0)
            {
                try
                {
                    var filer = await _userRepo.GetUserByIdAsync(userId);

                    var pdfInputFiles = cachedFiles.Select(cf =>
                    {
                        var stream = new MemoryStream(cf.Data);
                        var ff = new Microsoft.AspNetCore.Http.FormFile(
                            baseStream: stream,
                            baseStreamOffset: 0,
                            length: cf.Data.Length,
                            name: "files",
                            fileName: cf.Name)
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = cf.ContentType,
                        };
                        return (IFormFile)ff;
                    }).ToList();

                    created.AppealFilePDF = _pdfService.CompileDocumentsPdf(
                        created,
                        filer?.Name ?? "Unknown",
                        pdfInputFiles);
                    await _appealRepo.UpdateAppealAsync(created);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "PDF generation failed for Appeal {AppealID}. Appeal was saved without a compiled PDF.",
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
                HasPDF = created.AppealFilePDF != null && created.AppealFilePDF.Length > 0,
            };

            return CreatedAtAction(nameof(GetAppealById),
                new { id = created.AppealID }, response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/documents — list original uploads
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns metadata for all original files uploaded with this appeal.</summary>
        [HttpGet("{id}/documents")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAppealDocuments(int id)
        {
            var userOrgId = GetLoggedInUserOrgId();

            var appeal = await _appealRepo.GetAppealByIdAsync(id, userOrgId);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            string role = GetCurrentUserRole();
            if (!IsStaffRole(role) && appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            var docs = await _appealRepo.GetAppealDocumentsAsync(id, userOrgId);

            var response = docs.Select(d => new AppealDocumentResponseDto
            {
                DocumentID = d.DocumentID,
                AppealID = d.AppealID,
                FileName = d.FileName,
                ContentType = d.ContentType,
                FileSize = d.FileSize,
                UploadedAt = d.UploadedAt,
            }).ToList();

            return Ok(response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/documents/{docId}/view — inline view
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Streams a single original file for inline browser viewing.</summary>
        [HttpGet("{id}/documents/{docId}/view")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ViewAppealDocument(int id, int docId)
        {
            var userOrgId = GetLoggedInUserOrgId();

            var appeal = await _appealRepo.GetAppealByIdAsync(id, userOrgId);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            string role = GetCurrentUserRole();
            if (!IsStaffRole(role) && appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            var doc = await _appealRepo.GetAppealDocumentByIdAsync(id, docId, userOrgId);
            if (doc == null || doc.FileData == null || doc.FileData.Length == 0)
                return NotFound(new { message = $"Document {docId} not found." });

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{doc.FileName}\"";
            return File(doc.FileData, doc.ContentType);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/documents/{docId}/download — download
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Downloads a single original file with its original filename.</summary>
        [HttpGet("{id}/documents/{docId}/download")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DownloadAppealDocument(int id, int docId)
        {
            var userOrgId = GetLoggedInUserOrgId();

            var appeal = await _appealRepo.GetAppealByIdAsync(id, userOrgId);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            string role = GetCurrentUserRole();
            if (!IsStaffRole(role) && appeal.FiledBy != GetCurrentUserId())
                return Forbid();

            var doc = await _appealRepo.GetAppealDocumentByIdAsync(id, docId, userOrgId);
            if (doc == null || doc.FileData == null || doc.FileData.Length == 0)
                return NotFound(new { message = $"Document {docId} not found." });

            return File(doc.FileData, doc.ContentType, doc.FileName);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/pdf — combined PDF (all files merged)
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Downloads the auto-compiled combined PDF (all files merged).</summary>
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
                return NotFound(new { message = $"No combined PDF for Appeal {id}." });

            return File(appeal.AppealFilePDF, "application/pdf", $"Appeal-APL-{id}-Documents.pdf");
        }


        // ═══════════════════════════════════════════════════════════════
        //  PUT /api/appeals/{id}/decide — decide an appeal (3 outcomes)
        // ═══════════════════════════════════════════════════════════════
        /// <summary>
        /// Records a decision on an appeal. Handles all three outcomes:
        ///   • Upheld           — original decision stands, claim unchanged
        ///   • Overturned       — claim is RESET to Submitted for re-adjudication
        ///   • PartiallyUpheld  — manual claim adjustment required by staff
        /// </summary>
        [HttpPut("{id}/decide")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DecideAppeal(int id, [FromBody] DecideAppealDto dto)
        {
            var userOrgId = GetLoggedInUserOrgId();
            var deciderId = GetCurrentUserId();

            // 1. Look up the appeal (tenant-scoped)
            var appeal = await _appealRepo.GetAppealByIdAsync(id, userOrgId);
            if (appeal == null)
                return NotFound(new { message = $"Appeal {id} not found." });

            // 2. Only Filed / UnderReview appeals can be decided
            if (appeal.Status != AppealStatus.Filed && appeal.Status != AppealStatus.UnderReview)
                return BadRequest(new
                {
                    message = $"Appeal {id} has status '{appeal.Status}'. " +
                              $"Only Filed or UnderReview can be decided."
                });

            // 3. Validate outcome enum
            if (!Enum.TryParse<AppealOutcome>(dto.Outcome, true, out var parsedOutcome))
                return BadRequest(new
                {
                    message = $"Invalid Outcome '{dto.Outcome}'. " +
                              $"Must be one of: {string.Join(", ", Enum.GetNames<AppealOutcome>())}"
                });

            // 4. Record the decision on the appeal
            var decided = await _appealRepo.DecideAppealAsync(id, dto.Outcome, deciderId);
            if (decided == null)
                return NotFound(new { message = $"Appeal {id} could not be decided." });

            // 5. Handle each outcome's side-effects
            string filerMessage;
            var filerSeverity = NotificationSeverity.Info;
            bool claimResetDone = false;

            switch (parsedOutcome)
            {
                // ─── OUTCOME 1: UPHELD ─────────────────────────────────────
                case AppealOutcome.Upheld:
                    filerMessage =
                        $"Your appeal for Claim CLM-{appeal.ClaimID} has been reviewed. " +
                        $"The original decision has been UPHELD. No changes will be made to your claim.";
                    filerSeverity = NotificationSeverity.Info;
                    break;

                // ─── OUTCOME 2: OVERTURNED — force-reset claim ─────────────
                case AppealOutcome.Overturned:
                    claimResetDone = await _claimRepo.ResetClaimToSubmittedAsync(
                        appeal.ClaimID,
                        userOrgId,
                        deciderId,
                        $"Appeal APL-{appeal.AppealID} was OVERTURNED on " +
                        $"{DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");

                    if (!claimResetDone)
                    {
                        _logger.LogWarning(
                            "Claim {ClaimId} could not be reset after appeal {AppealId} was overturned.",
                            appeal.ClaimID, appeal.AppealID);
                    }

                    filerMessage =
                        $"Good news — your appeal for Claim CLM-{appeal.ClaimID} has been OVERTURNED. " +
                        $"The claim has been reset and will be re-adjudicated by our staff. " +
                        $"You will receive a notification when the new decision is made.";
                    filerSeverity = NotificationSeverity.Info;

                    await NotifyStaffForReAdjudicationAsync(appeal, deciderId, userOrgId);
                    break;

                // ─── OUTCOME 3: PARTIALLY UPHELD ───────────────────────────
                case AppealOutcome.PartiallyUpheld:
                    filerMessage =
                        $"Your appeal for Claim CLM-{appeal.ClaimID} has been PARTIALLY UPHELD. " +
                        $"Some aspects of the original decision will be corrected. " +
                        $"Our staff will manually adjust your claim and notify you when complete.";
                    filerSeverity = NotificationSeverity.Warning;

                    await CreateManualAdjustmentTaskAsync(appeal, deciderId, userOrgId);
                    break;

                default:
                    filerMessage = $"Your appeal for Claim CLM-{appeal.ClaimID} has been decided.";
                    break;
            }

            // 6. Notify the original appeal filer
            await _notifRepo.CreateAsync(new Notification
            {
                UserID = appeal.FiledBy,
                ClaimID = appeal.ClaimID,
                Message = filerMessage,
                Category = NotificationCategory.Appeal,
                Severity = filerSeverity,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = userOrgId,
            });

            // 7. Response
            return Ok(new
            {
                message = $"Appeal {id} decided as '{dto.Outcome}'.",
                appealId = id,
                claimId = appeal.ClaimID,
                outcome = dto.Outcome,
                claimWasReset = claimResetDone,
            });
        }


        // ═══════════════════════════════════════════════════════════════
        //  PUT /api/appeals/{id}/withdraw — owner withdraws own appeal
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
                return BadRequest(new
                {
                    message = $"Appeal {id} has status '{appeal.Status}' and cannot be withdrawn."
                });

            await _appealRepo.WithdrawAppealAsync(id);
            return Ok(new { message = $"Appeal {id} withdrawn successfully." });
        }


        // ═══════════════════════════════════════════════════════════════
        //  POST /api/appeals/subrogation — create subrogation record
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
                OrganizationID = GetLoggedInUserOrgId(),
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
        //  GET /api/appeals/subrogation — list subrogations
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns all subrogation records for this organization.</summary>
        [HttpGet("subrogation")]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSubrogations()
        {
            var subrogations = await _appealRepo.GetSubrogationsAsync(GetLoggedInUserOrgId());
            return Ok(subrogations);
        }


        // ═══════════════════════════════════════════════════════════════
        //  Helper methods
        // ═══════════════════════════════════════════════════════════════

        /// <summary>Notify all in-org InsuranceStaff that an overturned appeal needs re-adjudication.</summary>
        private async Task NotifyStaffForReAdjudicationAsync(
            Appeal appeal, int deciderId, int? userOrgId)
        {
            var staffUsers = await _userRepo.GetUsersByRoleAsync(UserRole.InsuranceStaff, userOrgId);
            foreach (var staff in staffUsers)
            {
                if (staff.UserID == deciderId) continue;   // don't notify self

                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = staff.UserID,
                    ClaimID = appeal.ClaimID,
                    Message =
                        $"Claim CLM-{appeal.ClaimID} has been RESET to Submitted following " +
                        $"an overturned appeal (APL-{appeal.AppealID}). " +
                        $"Please re-adjudicate within 7 days.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Warning,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = userOrgId,
                });
            }
        }

        /// <summary>Create a self-task for the decider to manually adjust the claim.</summary>
        private async Task CreateManualAdjustmentTaskAsync(
            Appeal appeal, int deciderId, int? userOrgId)
        {
            await _notifRepo.CreateAsync(new Notification
            {
                UserID = deciderId,
                ClaimID = appeal.ClaimID,
                Message =
                    $"ACTION REQUIRED: Claim CLM-{appeal.ClaimID} was PARTIALLY UPHELD " +
                    $"on appeal APL-{appeal.AppealID}. Please review the claim lines and " +
                    $"adjust amounts manually. Notify the filer when adjustments are complete.",
                Category = NotificationCategory.Appeal,
                Severity = NotificationSeverity.Warning,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = userOrgId,
            });
        }

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