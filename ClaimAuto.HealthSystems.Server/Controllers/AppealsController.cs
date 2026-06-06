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
        private readonly IMemberRepository _memberRepo;
        private readonly INotificationRepository _notifRepo;
        private readonly IAppealPdfRepository _pdfService;
        private readonly IAdjudicationRepository _adjRepo;
        private readonly IOrganizationRepository _orgRepo;
        private readonly ILogger<AppealsController> _logger;

        public AppealsController(
            IAppealRepository appealRepo,
            IClaimRepository claimRepo,
            IUserRepository userRepo,
            IMemberRepository memberRepo,
            INotificationRepository notifRepo,
            IAppealPdfRepository pdfService,
            IAdjudicationRepository adjRepo,
            IOrganizationRepository orgRepo,
            ILogger<AppealsController> logger)
        {
            _appealRepo = appealRepo;
            _claimRepo = claimRepo;
            _userRepo = userRepo;
            _memberRepo = memberRepo;
            _notifRepo = notifRepo;
            _pdfService = pdfService;
            _adjRepo = adjRepo;
            _orgRepo = orgRepo;
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
            int userId = GetCurrentUserId();
            string role = GetCurrentUserRole();
            var userOrgId = GetLoggedInUserOrgId();

            var claim = await _claimRepo.GetClaimByIdAsync(claimID, userOrgId);
            if (claim == null)
                return NotFound(new { message = $"Claim {claimID} not found." });

            // ── Claim must be Rejected or Adjudicated ──
            if (role == nameof(UserRole.Policyholder))
            {
                var member = await _memberRepo.GetMemberByIdAsync(claim.MemberID, userOrgId);
                var isOwnMemberClaim = member?.PolicyholderUserID == userId;
                var isOwnReimbursementClaim = claim.ProviderID == userId;

                if (!isOwnMemberClaim && !isOwnReimbursementClaim)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "You can only appeal claims linked to your own member profile."
                    });
                }
            }
            else if (role == nameof(UserRole.Hospital) && claim.ProviderID != userId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "You can only appeal claims submitted by your hospital account."
                });
            }

            if (!Enum.TryParse<ClaimStatus>(claim.Status, true, out var claimStatus)
                || (claimStatus != ClaimStatus.Rejected))
            {
                return BadRequest(new
                {
                    message = $"Claim {claimID} has status '{claim.Status}'. Only Rejected claims can be appealed."
                });
            }

            // ── No duplicate active appeal ──
            var existingAppeals = await _appealRepo.GetAppealsByClaimIdAsync(claimID, userOrgId);
            var activeAppeal = existingAppeals.FirstOrDefault(
                a => a.Status == AppealStatus.Filed || a.Status == AppealStatus.UnderReview);
            if (activeAppeal != null)
                return Conflict(new
                {
                    message = $"Active appeal exists for Claim {claimID}. AppealID: {activeAppeal.AppealID}"
                });

            if (string.IsNullOrWhiteSpace(reason))
                return BadRequest(new { message = "Appeal reason is required." });

            

            // ── Store uploaded file names in DocumentsJSON ──
            string? documentsJSON = null;
            // ════════════════════════════════════════════════════════════
            //  Pre-read all uploaded files into memory ONCE.
            //  IFormFile streams can only be consumed once. We need the
            //  bytes for BOTH AppealDocument storage AND PDF compilation,
            //  so we cache them up front and reuse them everywhere.
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

            // ── Store uploaded file names in DocumentsJSON (legacy compat) ──
            //string? documentsJSON = null;
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
                OrganizationID = userOrgId,       // SaaS tenant stamp
            };

            var created = await _appealRepo.FileAppealAsync(appeal);

            // ── Persist each original file as an AppealDocument row ──
            if (cachedFiles.Count > 0)
            {
                try
                {
                    var docs = cachedFiles.Select(cf => new AppealDocument
                    {
                        AppealID       = created.AppealID,
                        FileName       = cf.Name,
                        ContentType    = cf.ContentType,
                        FileSize       = cf.Data.Length,
                        FileData       = cf.Data,
                        UploadedAt     = DateTime.UtcNow,
                        OrganizationID = userOrgId,
                    }).ToList();

                    await _appealRepo.SaveAppealDocumentsAsync(created.AppealID, docs);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Saving AppealDocuments failed for Appeal {AppealID}. Appeal was saved without original files.",
                        created.AppealID);
                    // Non-fatal — appeal is still filed, individual files just missing
                }
            }

            // ── Compile uploaded documents into a single audit-ready PDF ──
            // Re-wrap cached bytes as IFormFile so we don't have to change the PDF service.
            if (cachedFiles.Count > 0)
            {
                try
                {
                    var filer = await _userRepo.GetUserByIdAsync(userId);

                    // Org name is best-effort — failure here shouldn't block PDF generation.
                    string? orgName = null;
                    if (userOrgId.HasValue)
                    {
                        try
                        {
                            var org = await _orgRepo.GetByIdAsync(userOrgId.Value);
                            orgName = org?.Name;
                        }
                        catch { /* leave orgName null — PDF falls back to brand */ }
                    }

                    // Compose the richer context the PDF renderer needs.
                    var pdfContext = new AppealPdfContext(
                        FilerName:           filer?.Name ?? "Unknown",
                        FilerRole:           filer?.Role.ToString(),
                        ClaimReference:      !string.IsNullOrWhiteSpace(claim.ExternalClaimRef)
                                                ? claim.ExternalClaimRef
                                                : $"CLM-{claim.ClaimID}",
                        MemberName:          claim.MemberName,
                        ProviderName:        claim.ProviderName,
                        ClaimTypeDisplay:    claim.ClaimType,
                        ClaimAmount:         claim.TotalBilledAmount,
                        ClaimStatusDisplay:  claim.Status,
                        OrganizationName:    orgName
                    );

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
                        pdfContext,
                        pdfInputFiles);
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
                    Message = $"New appeal filed for CLM-{claimID} by a policyholder. " +
                                     $"Please review within 7 days.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Warning,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = userOrgId,
                });
            }

            // ── Confirm to the policyholder that their appeal was received ──
            await _notifRepo.CreateAsync(new Notification
            {
                UserID = userId,
                ClaimID = claimID,
                Message = $"Your appeal for CLM-{claimID} has been received and is under review. " +
                                 $"You will be notified within 7 days once a decision is made.",
                Category = NotificationCategory.Appeal,
                Severity = NotificationSeverity.Info,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = userOrgId,
            });

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
        //  GET /api/appeals/{id}/documents — list original uploaded files
        // ═══════════════════════════════════════════════════════════════
        /// <summary>Returns metadata for every original file uploaded with this appeal.</summary>
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
                DocumentID  = d.DocumentID,
                AppealID    = d.AppealID,
                FileName    = d.FileName,
                ContentType = d.ContentType,
                FileSize    = d.FileSize,
                UploadedAt  = d.UploadedAt,
            }).ToList();

            return Ok(response);
        }


        // ═══════════════════════════════════════════════════════════════
        //  GET /api/appeals/{id}/documents/{docId}/view — inline preview
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
        //  GET /api/appeals/{id}/documents/{docId}/download — file save
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

            var orgId = GetLoggedInUserOrgId();

            if (parsedOutcome == AppealOutcome.Overturned)
            {
                // Step 1: Reset claim to Submitted so the adjudication engine can re-evaluate it
                await _claimRepo.UpdateClaimAsync(
                    appeal.ClaimID,
                    new UpdateClaimDto { Status = ClaimStatus.Submitted.ToString() },
                    deciderId,
                    orgId);

                // Step 2: Notify the policyholder immediately that appeal was successful
                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = appeal.FiledBy,
                    ClaimID = appeal.ClaimID,
                    Message = $"Great news! Your appeal for CLM-{appeal.ClaimID} was successful " +
                                     $"(Overturned). Your claim is being re-processed and payment will " +
                                     $"be created shortly. You will receive another notification when ready.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Info,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = orgId,
                });

                // Step 3: Auto-adjudicate immediately — this creates the payment and
                // sends payment-ready notifications to both policyholder and staff
                try
                {
                    await _adjRepo.AutoAdjudicateAsync(appeal.ClaimID, orgId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Auto-adjudication after appeal overturn failed for Claim {ClaimID}. " +
                        "Staff will need to manually adjudicate.", appeal.ClaimID);

                    // Fallback: notify staff to manually process
                    var staffUsers = await _userRepo.GetUsersByRoleAsync(UserRole.InsuranceStaff, orgId);
                    foreach (var staff in staffUsers)
                    {
                        await _notifRepo.CreateAsync(new Notification
                        {
                            UserID = staff.UserID,
                            ClaimID = appeal.ClaimID,
                            Message = $"Appeal for CLM-{appeal.ClaimID} was Overturned. " +
                                             $"Auto-adjudication failed — please manually adjudicate " +
                                             $"this claim to create the payment.",
                            Category = NotificationCategory.Exception,
                            Severity = NotificationSeverity.Warning,
                            Status = NotificationStatus.Unread,
                            CreatedAt = DateTime.UtcNow,
                            OrganizationID = orgId,
                        });
                    }
                }
            }
            else if (parsedOutcome == AppealOutcome.PartiallyUpheld)
            {
                // ── Validate the partial-payable inputs ──────────────────────
                if (!dto.PartialPayableAmount.HasValue || dto.PartialPayableAmount.Value <= 0)
                    return BadRequest(new
                    {
                        message = "PartialPayableAmount is required and must be greater than 0 " +
                                  "when Outcome is PartiallyUpheld."
                    });

                if (string.IsNullOrWhiteSpace(dto.PartialReason) || dto.PartialReason.Trim().Length < 10)
                    return BadRequest(new
                    {
                        message = "PartialReason is required (minimum 10 characters) for an audit trail " +
                                  "when Outcome is PartiallyUpheld."
                    });

                // Load the claim to check the cap and to capture original billed amount for the notification.
                var claimDto = await _claimRepo.GetClaimByIdAsync(appeal.ClaimID, orgId);
                if (claimDto == null)
                    return NotFound(new { message = $"Linked claim CLM-{appeal.ClaimID} not found." });

                if (dto.PartialPayableAmount.Value > claimDto.TotalBilledAmount)
                    return BadRequest(new
                    {
                        message = $"PartialPayableAmount (₹{dto.PartialPayableAmount.Value:N2}) cannot exceed " +
                                  $"the original billed amount (₹{claimDto.TotalBilledAmount:N2})."
                    });

                // ── Use manual adjudication path ─────────────────────────────
                // ManualAdjudicateAsync creates the AdjudicationRecord, updates Claim+Lines status,
                // auto-creates the Payment (Pending), and writes the audit log. Reusing it keeps the
                // single source of truth for "what happens when a claim is partially approved".
                var manualDto = new ManualAdjudicateDto
                {
                    ClaimID       = appeal.ClaimID,
                    Decision      = "Partial",
                    PayableAmount = dto.PartialPayableAmount.Value,
                    Notes         = $"Appeal APL-{appeal.AppealID} partially upheld. " +
                                    $"Original billed: ₹{claimDto.TotalBilledAmount:N2}, " +
                                    $"approved: ₹{dto.PartialPayableAmount.Value:N2}. " +
                                    $"Reason: {dto.PartialReason!.Trim()}",
                };

                try
                {
                    await _adjRepo.ManualAdjudicateAsync(manualDto, deciderId, orgId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Manual adjudication after PartiallyUpheld appeal failed for Claim {ClaimID}.",
                        appeal.ClaimID);
                    return StatusCode(500, new
                    {
                        message = "The appeal was decided, but creating the partial payment failed. " +
                                  "Please re-process this claim manually."
                    });
                }

                // ── Notify the filer with the actual numbers ─────────────────
                var percentApproved = claimDto.TotalBilledAmount > 0
                    ? (double)(dto.PartialPayableAmount.Value / claimDto.TotalBilledAmount) * 100
                    : 0;

                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = appeal.FiledBy,
                    ClaimID = appeal.ClaimID,
                    Message = $"Your appeal for CLM-{appeal.ClaimID} has been Partially Upheld. " +
                              $"₹{dto.PartialPayableAmount.Value:N2} of ₹{claimDto.TotalBilledAmount:N2} " +
                              $"({percentApproved:F0}%) will be paid. " +
                              $"Reason: {dto.PartialReason!.Trim()}. " +
                              $"Payment is now pending staff authorization.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Info,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = orgId,
                });
            }
            else // Upheld — rejection stands
            {
                await _notifRepo.CreateAsync(new Notification
                {
                    UserID = appeal.FiledBy,
                    ClaimID = appeal.ClaimID,
                    Message = $"Your appeal for CLM-{appeal.ClaimID} has been reviewed. " +
                                     $"Decision: Upheld — the original rejection stands. " +
                                     $"The claim remains Rejected. If you have new evidence, " +
                                     $"please contact your insurance provider.",
                    Category = NotificationCategory.Appeal,
                    Severity = NotificationSeverity.Warning,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = orgId,
                });
            }

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
        private int GetCurrentUserId() => GetLoggedInUserId() ?? 0;
        private string GetCurrentUserRole() => GetLoggedInUserRole() ?? "Unknown";
        private bool IsStaffRole(string role) => role == "Admin" || role == "InsuranceStaff";
    }
}
