using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class ClaimRepository : IClaimRepository
    {
        private readonly ApplicationDbContext _db;

        public ClaimRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET ALL CLAIMS — with role-based + tenant filtering
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimResponseDto>> GetAllClaimsAsync(
    string? status, string? priority, int? userId, string? userRole,
    int? userOrgId = null, int? page = null, int? pageSize = null)
        {
            var query = _db.Claims.AsQueryable();

            // ── Multi-tenant filter (Phase 4) ────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            // ── Role-based filtering ─────────────────────────────────────
            if (userRole == "Hospital" && userId.HasValue)
                query = query.Where(c => c.ProviderID == userId.Value);

            if (userRole == "Policyholder" && userId.HasValue)
            {
                var myMemberIds = await _db.Members
                    .Where(m => m.PolicyholderUserID == userId.Value)
                    .Select(m => m.MemberID)
                    .ToListAsync();

                query = query.Where(c =>
                    c.ProviderID == userId.Value ||
                    myMemberIds.Contains(c.MemberID)
                );
            }

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClaimStatus>(status, out var parsedStatus))
                query = query.Where(c => c.Status == parsedStatus);

            if (!string.IsNullOrEmpty(priority) && Enum.TryParse<ClaimPriority>(priority, out var parsedPriority))
                query = query.Where(c => c.Priority == parsedPriority);

            var pagedQuery = query
    .OrderByDescending(c => c.SubmittedAt)
    .Select(c => new ClaimResponseDto
    {
        ClaimID = c.ClaimID,
        ExternalClaimRef = c.ExternalClaimRef,
        ProviderID = c.ProviderID,
        ProviderName = c.Provider.Name,
        MemberID = c.MemberID,
        MemberName = c.Member.Name,
        PolicyName = c.Policy.PlanName,
        ClaimType = c.ClaimType.ToString(),
        TotalBilledAmount = c.TotalBilledAmount,
        Currency = c.Currency,
        Status = c.Status.ToString(),
        Priority = c.Priority.ToString(),
        SubmittedAt = c.SubmittedAt,
        Notes = c.Notes,
    });

            if (page.HasValue && pageSize.HasValue && pageSize.Value > 0)
                pagedQuery = pagedQuery
                    .Skip((page.Value - 1) * pageSize.Value)
                    .Take(pageSize.Value);

            return await pagedQuery.ToListAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET CLAIM BY ID — full detail + tenant ownership check
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimDetailResponseDto?> GetClaimByIdAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.Claims
                .Include(c => c.Provider)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.ClaimLines)
                .Include(c => c.ClaimDocuments)
                    .ThenInclude(d => d.Uploader)
                .Include(c => c.ClaimDocuments)
                    .ThenInclude(d => d.VerifiedBy)
                .Include(c => c.AdjudicationRecords)
                    .ThenInclude(a => a.PerformedBy)
                .AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null) return null;

            var latestAdj = claim.AdjudicationRecords
                .OrderByDescending(a => a.ExecutedAt)
                .FirstOrDefault();

            return new ClaimDetailResponseDto
            {
                ClaimID = claim.ClaimID,
                ExternalClaimRef = claim.ExternalClaimRef,
                ProviderID = claim.ProviderID,
                MemberID = claim.MemberID,
                ProviderName = claim.Provider.Name,
                MemberName = claim.Member.Name,
                PolicyName = claim.Policy.PlanName,
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                Currency = claim.Currency,
                Status = claim.Status.ToString(),
                Priority = claim.Priority.ToString(),
                SourceChannel = claim.SourceChannel.ToString(),
                SubmittedAt = claim.SubmittedAt,
                ReceivedAt = claim.ReceivedAt,
                Notes = claim.Notes,

                ClaimLines = claim.ClaimLines.Select(l => new ClaimLineResponseDto
                {
                    LineID = l.LineID,
                    ClaimID = l.ClaimID,
                    ServiceCode = l.ServiceCode,
                    ServiceDate = l.ServiceDate,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    LineBilledAmount = l.LineBilledAmount,
                    DiagnosisCodesJSON = l.DiagnosisCodesJSON,
                    ProcedureCodesJSON = l.ProcedureCodesJSON,
                    LineStatus = l.LineStatus.ToString()
                }).ToList(),

                ClaimDocuments = claim.ClaimDocuments.Select(d => new ClaimDocumentResponseDto
                {
                    DocID = d.DocID,
                    ClaimID = d.ClaimID,
                    UploadedByID = d.UploadedBy,
                    UploadedByName = d.Uploader.Name,
                    VerifiedByName = d.VerifiedBy != null ? d.VerifiedBy.Name : null,
                    DocType = d.DocType.ToString(),
                    FileURI = d.FileURI,
                    SHA256 = d.SHA256,
                    UploadedAt = d.UploadedAt,
                    Status = d.Status.ToString()
                }).ToList(),

                Adjudication = latestAdj == null ? null : new AdjudicationResponseDto
                {
                    AdjID = latestAdj.AdjID,
                    ClaimID = latestAdj.ClaimID,
                    ExecutedAt = latestAdj.ExecutedAt,
                    EngineVersion = latestAdj.EngineVersion,
                    Decision = latestAdj.Decision.ToString(),
                    CalculationsJSON = latestAdj.CalculationsJSON,
                    AppliedRulesJSON = latestAdj.AppliedRulesJSON,
                    Notes = latestAdj.Notes,
                    PerformedByName = latestAdj.PerformedBy?.Name ?? "System (Auto)"
                }
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  CHECK IF EXTERNAL CLAIM REF EXISTS — per-tenant uniqueness (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<bool> ExternalClaimRefExistsAsync(string externalClaimRef, int? userOrgId = null)
        {
            var query = _db.Claims.Where(c => c.ExternalClaimRef == externalClaimRef);

            // ── Multi-tenant filter (Phase 4) ────────────────────────────
            // Two different orgs may legitimately use the same ExternalClaimRef.
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            return await query.AnyAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  SUBMIT CLAIM — hospital submits a new claim
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimResponseDto?> SubmitClaimAsync(CreateClaimDto dto, int submittedByUserId, int? userOrgId = null)
        {
            var provider = await _db.Users.FindAsync(dto.ProviderID);
            if (provider == null) return null;

            if (dto.ClaimType == "Reimbursement")
            {
                if (provider.Role != UserRole.Policyholder) return null;
            }
            else
            {
                if (provider.Role != UserRole.Hospital) return null;
            }

            var member = await _db.Members.FindAsync(dto.MemberID);
            if (member == null) return null;

            var policy = await _db.Policies.FindAsync(dto.PolicyID);
            if (policy == null || policy.Status != PolicyStatus.Active)
                return null;

            if (!Enum.TryParse<ClaimType>(dto.ClaimType, out var claimType))
                return null;

            if (!Enum.TryParse<ClaimPriority>(dto.Priority, out var priority))
                return null;

            if (!Enum.TryParse<SourceChannel>(dto.SourceChannel, out var sourceChannel))
                return null;

            if (dto.TotalBilledAmount <= 0)
                return null;

            var now = DateTime.UtcNow;

            var claim = new Claim
            {
                ExternalClaimRef = dto.ExternalClaimRef,
                ProviderID = dto.ProviderID,
                MemberID = dto.MemberID,
                PolicyID = dto.PolicyID,
                ClaimType = claimType,
                SubmittedAt = now,
                ReceivedAt = now,
                TotalBilledAmount = dto.TotalBilledAmount,
                Currency = dto.Currency,
                Status = ClaimStatus.DocsVerificationPending,
                Priority = priority,
                SourceChannel = sourceChannel,
                Notes = dto.Notes,
                OrganizationID = userOrgId,   // ← Phase 4: tenant stamp
            };

            _db.Claims.Add(claim);

            var audit = new AuditLog
            {
                UserID = submittedByUserId,
                Action = "SubmitClaim",
                ResourceType = "Claim",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"externalRef\":\"{dto.ExternalClaimRef}\"," +
                              $"\"providerID\":{dto.ProviderID}," +
                              $"\"memberID\":{dto.MemberID}," +
                              $"\"policyID\":{dto.PolicyID}," +
                              $"\"amount\":{dto.TotalBilledAmount}}}",
                Timestamp = now,
                OrganizationID = userOrgId,
            };

            _db.AuditLogs.Add(audit);
            await _db.SaveChangesAsync();   // ← After this line, claim.ClaimID is populated by the DB

            // ── Persist service lines submitted with the claim ────────────────
            // Lines are sent inside the POST body so the adjudication engine has
            // real line data to work with immediately after submission.
            // Each line inherits OrganizationID from the parent claim (multi-tenant).
            // LineStatus starts as Pending — adjudication sets Approved / Denied.
            if (dto.Lines != null && dto.Lines.Count > 0)
            {
                foreach (var lineDto in dto.Lines)
                {
                    _db.ClaimLines.Add(new ClaimLine
                    {
                        ClaimID = claim.ClaimID,
                        ServiceCode = lineDto.ServiceCode,
                        ServiceDate = lineDto.ServiceDate,
                        Quantity = lineDto.Quantity,
                        UnitPrice = lineDto.UnitPrice,
                        LineBilledAmount = lineDto.LineBilledAmount,
                        DiagnosisCodesJSON = lineDto.DiagnosisCodesJSON,
                        ProcedureCodesJSON = lineDto.ProcedureCodesJSON,
                        LineStatus = LineStatus.Pending,
                        OrganizationID = userOrgId,
                    });
                }
            }

            // ── Persist documents submitted with the claim ────────────────
            // Documents are saved here so they exist BEFORE adjudication runs.
            // DocStatus starts as Pending — staff verifies after submission.
            if (dto.Documents != null && dto.Documents.Count > 0)
            {
                foreach (var docDto in dto.Documents)
                {
                    if (!Enum.TryParse<DocType>(docDto.DocType, out var docType))
                        docType = DocType.Invoice;

                    _db.ClaimDocuments.Add(new ClaimDocument
                    {
                        ClaimID = claim.ClaimID,
                        UploadedBy = submittedByUserId,
                        DocType = docType,
                        FileURI = docDto.FileURI,
                        SHA256 = docDto.SHA256,
                        UploadedAt = now,
                        Status = DocStatus.Pending,
                        OrganizationID = userOrgId,
                    });
                }
            }

            audit.ResourceID = claim.ClaimID.ToString();
            await _db.SaveChangesAsync();   // ← Saves lines + documents + updates audit ResourceID

            // ── Notify all staff + admin: new claim awaiting document verification ────
            var staffToNotify = await _db.Users
                .Where(u => (u.Role == UserRole.InsuranceStaff || u.Role == UserRole.Admin)
                         && u.Status == AccountStatus.Active
                         && (userOrgId == null || u.OrganizationID == userOrgId))
                .ToListAsync();

            foreach (var staffUser in staffToNotify)
            {
                _db.Notifications.Add(new Notification
                {
                    UserID = staffUser.UserID,
                    ClaimID = claim.ClaimID,
                    Message = $"New claim CLM-{claim.ClaimID} submitted by {provider.Name}. " +
                                     $"Documents require verification before adjudication can proceed.",
                    Category = NotificationCategory.Exception,
                    Severity = NotificationSeverity.Info,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = userOrgId,
                });
            }
            if (staffToNotify.Count > 0)
                await _db.SaveChangesAsync();

            return new ClaimResponseDto
            {
                ClaimID = claim.ClaimID,
                ExternalClaimRef = claim.ExternalClaimRef,
                ProviderID = claim.ProviderID,
                ProviderName = provider.Name,
                MemberID = claim.MemberID,
                MemberName = member.Name,
                PolicyName = policy.PlanName,
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                Currency = claim.Currency,
                Status = claim.Status.ToString(),
                Priority = claim.Priority.ToString(),
                SubmittedAt = claim.SubmittedAt,
                Notes = claim.Notes,
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  UPDATE CLAIM — staff updates status or priority
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, UpdateClaimDto dto, int updatedByUserId, int? userOrgId = null)
        {
            var query = _db.Claims
                .Include(c => c.Provider)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Where(c => c.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();

            if (claim == null) return null;

            var changes = new List<string>();

            if (!string.IsNullOrEmpty(dto.Priority))
            {
                if (Enum.TryParse<ClaimPriority>(dto.Priority, out var newPriority)
                    && newPriority != claim.Priority)
                {
                    changes.Add($"Priority: '{claim.Priority}' → '{dto.Priority}'");
                    claim.Priority = newPriority;
                }
            }

            if (!string.IsNullOrEmpty(dto.Status))
            {
                if (Enum.TryParse<ClaimStatus>(dto.Status, out var newStatus)
                    && newStatus != claim.Status)
                {
                    changes.Add($"Status: '{claim.Status}' → '{dto.Status}'");
                    claim.Status = newStatus;
                }
            }

            if (changes.Any())
            {
                var audit = new AuditLog
                {
                    UserID = updatedByUserId,
                    Action = "UpdateClaim",
                    ResourceType = "Claim",
                    ResourceID = claimId.ToString(),
                    DetailsJSON = $"{{\"changes\": " +
                                   $"[{string.Join(", ", changes.Select(c => $"\"{c}\""))}]}}",
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = userOrgId,
                };
                _db.AuditLogs.Add(audit);
                await _db.SaveChangesAsync();

                // ── Notify provider when their claim is rejected by staff ────────────
                if (claim.Status == ClaimStatus.Rejected)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserID = claim.ProviderID,
                        ClaimID = claim.ClaimID,
                        Message = $"Your claim CLM-{claim.ClaimID} has been rejected by insurance staff. " +
                                         $"If you believe this is incorrect, you may file an appeal.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Warning,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = userOrgId,
                    });
                    await _db.SaveChangesAsync();
                }
            }

            return new ClaimResponseDto
            {
                ClaimID = claim.ClaimID,
                ExternalClaimRef = claim.ExternalClaimRef,
                ProviderID = claim.ProviderID,
                ProviderName = claim.Provider.Name,
                MemberID = claim.MemberID,
                MemberName = claim.Member.Name,
                PolicyName = claim.Policy.PlanName,
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                Currency = claim.Currency,
                Status = claim.Status.ToString(),
                Priority = claim.Priority.ToString(),
                SubmittedAt = claim.SubmittedAt
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  DELETE CLAIM — only Rejected claims, tenant-aware (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<string> DeleteClaimAsync(int claimId, int deletedByUserId, int? userOrgId = null)
        {
            // Tenant-aware lookup: if userOrgId is supplied, the claim must belong to that org.
            // Cross-tenant attempts get "notfound" (don't reveal existence across tenants).
            var query = _db.Claims.Where(c => c.ClaimID == claimId);
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();
            if (claim == null) return "notfound";

            if (claim.Status != ClaimStatus.Rejected)
                return "notrejected";

            var audit = new AuditLog
            {
                UserID = deletedByUserId,
                Action = "DeleteClaim",
                ResourceType = "Claim",
                ResourceID = claimId.ToString(),
                DetailsJSON = $"{{\"externalRef\":\"{claim.ExternalClaimRef}\"," +
                              $"\"status\":\"{claim.Status}\"," +
                              $"\"reason\":\"Hard deleted — Rejected claim removed\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId,
            };
            _db.AuditLogs.Add(audit);

            // ── Step 1: Remove all child records that block deletion (FK Restrict) ──
            // Order does not matter here because all changes go into a single
            // SaveChangesAsync() at the end — EF sends them as one DB transaction.

            // ClaimLines and ClaimDocuments (were already handled — kept as-is)
            var lines = await _db.ClaimLines.Where(l => l.ClaimID == claimId).ToListAsync();
            _db.ClaimLines.RemoveRange(lines);

            var docs = await _db.ClaimDocuments.Where(d => d.ClaimID == claimId).ToListAsync();
            _db.ClaimDocuments.RemoveRange(docs);

            // AdjudicationRecords — exist on any claim that went through the engine
            var adjRecords = await _db.AdjudicationRecords.Where(a => a.ClaimID == claimId).ToListAsync();
            _db.AdjudicationRecords.RemoveRange(adjRecords);

            // FraudScores — created during validation for every claim
            var fraudScores = await _db.FraudScores.Where(f => f.ClaimID == claimId).ToListAsync();
            _db.FraudScores.RemoveRange(fraudScores);

            // FraudCases — auto-opened if fraud score was >= 70
            var fraudCases = await _db.FraudCases.Where(f => f.ClaimID == claimId).ToListAsync();
            _db.FraudCases.RemoveRange(fraudCases);

            // Notifications — fraud alerts and status change notifications
            var notifications = await _db.Notifications.Where(n => n.ClaimID == claimId).ToListAsync();
            _db.Notifications.RemoveRange(notifications);

            // ClaimTasks — any task assigned against this claim
            var tasks = await _db.ClaimTasks.Where(t => t.ClaimID == claimId).ToListAsync();
            _db.ClaimTasks.RemoveRange(tasks);

            // Appeals — member may have filed an appeal before rejection
            var appeals = await _db.Appeals.Where(a => a.ClaimID == claimId).ToListAsync();
            _db.Appeals.RemoveRange(appeals);

            // ── Step 2: Now it is safe to remove the Claim itself ──
            _db.Claims.Remove(claim);
            await _db.SaveChangesAsync();

            return "ok";
        }

        // ══════════════════════════════════════════════════════════════════
        //  ADD CLAIM LINE — adds a service line item to a claim
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimLineResponseDto?> AddClaimLineAsync(int claimId, AddClaimLineDto dto, int addedByUserId)
        {
            var claim = await _db.Claims.FindAsync(claimId);
            if (claim == null) return null;

            if (claim.Status == ClaimStatus.Approved ||
                claim.Status == ClaimStatus.Paid ||
                claim.Status == ClaimStatus.Rejected)
                return null;

            var line = new ClaimLine
            {
                ClaimID = claimId,
                ServiceCode = dto.ServiceCode,
                ServiceDate = dto.ServiceDate,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                LineBilledAmount = dto.LineBilledAmount,
                DiagnosisCodesJSON = dto.DiagnosisCodesJSON,
                ProcedureCodesJSON = dto.ProcedureCodesJSON,
                LineStatus = LineStatus.Pending,
                OrganizationID = claim.OrganizationID,   // ← Phase 4: inherit from parent claim
            };

            _db.ClaimLines.Add(line);

            var audit = new AuditLog
            {
                UserID = addedByUserId,
                Action = "AddClaimLine",
                ResourceType = "ClaimLine",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"claimID\":{claimId}," +
                               $"\"serviceCode\":\"{dto.ServiceCode}\"," +
                               $"\"amount\":{dto.LineBilledAmount}}}",
                OrganizationID = claim.OrganizationID,
                Timestamp = DateTime.UtcNow,

            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            audit.ResourceID = line.LineID.ToString();
            await _db.SaveChangesAsync();

            return new ClaimLineResponseDto
            {
                LineID = line.LineID,
                ClaimID = line.ClaimID,
                ServiceCode = line.ServiceCode,
                ServiceDate = line.ServiceDate,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineBilledAmount = line.LineBilledAmount,
                DiagnosisCodesJSON = line.DiagnosisCodesJSON,
                ProcedureCodesJSON = line.ProcedureCodesJSON,
                LineStatus = line.LineStatus.ToString()
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET CLAIM LINES — tenant-scoped read (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimLineResponseDto>> GetClaimLinesAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.ClaimLines
                .Where(l => l.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(l => l.OrganizationID == userOrgId.Value);

            return await query
                .Select(l => new ClaimLineResponseDto
                {
                    LineID = l.LineID,
                    ClaimID = l.ClaimID,
                    ServiceCode = l.ServiceCode,
                    ServiceDate = l.ServiceDate,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    LineBilledAmount = l.LineBilledAmount,
                    DiagnosisCodesJSON = l.DiagnosisCodesJSON,
                    ProcedureCodesJSON = l.ProcedureCodesJSON,
                    LineStatus = l.LineStatus.ToString()
                })
                .ToListAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  UPLOAD DOCUMENT — saves document reference with SHA-256 hash
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimDocumentResponseDto?> UploadDocumentAsync(
     int claimId,
     Microsoft.AspNetCore.Http.IFormFile file,
     string docType,
     int uploadedByUserId)
        {
            var claim = await _db.Claims.FindAsync(claimId);
            if (claim == null) return null;

            var uploader = await _db.Users.FindAsync(uploadedByUserId);
            if (uploader == null) return null;

            if (!Enum.TryParse<DocType>(docType, out var parsedDocType))
                return null;

            if (file == null || file.Length == 0)
                return null;

            // Read file bytes into memory
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            // Generate SHA256 for tamper-detection
            var sha256 = Convert.ToHexString(
                System.Security.Cryptography.SHA256.HashData(bytes)
            ).ToLowerInvariant();

            var doc = new ClaimDocument
            {
                ClaimID = claimId,
                UploadedBy = uploadedByUserId,
                DocType = parsedDocType,
                FileName = file.FileName,
                ContentType = string.IsNullOrEmpty(file.ContentType)
                                    ? "application/octet-stream"
                                    : file.ContentType,
                FileSize = file.Length,
                FileData = bytes,
                FileURI = $"db://claimdoc/{Guid.NewGuid()}",   // pseudo-URI (file is in DB)
                SHA256 = sha256,
                UploadedAt = DateTime.UtcNow,
                Status = DocStatus.Pending,
                OrganizationID = claim.OrganizationID,
            };

            _db.ClaimDocuments.Add(doc);
            await _db.SaveChangesAsync();

            // ── Notify staff when hospital/policyholder re-uploads during doc review ──
            if (claim.Status == ClaimStatus.DocsVerificationPending
             && (uploader.Role == UserRole.Hospital || uploader.Role == UserRole.Policyholder))
            {
                var staffToAlert = await _db.Users
                    .Where(u => (u.Role == UserRole.InsuranceStaff || u.Role == UserRole.Admin)
                             && u.Status == AccountStatus.Active
                             && (claim.OrganizationID == null || u.OrganizationID == claim.OrganizationID))
                    .ToListAsync();

                foreach (var staffUser in staffToAlert)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserID = staffUser.UserID,
                        ClaimID = claimId,
                        Message = $"{uploader.Name} has uploaded a new document ({dto.DocType}) " +
                                         $"for CLM-{claimId}. Please review the updated document set.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Info,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = claim.OrganizationID,
                    });
                }
                if (staffToAlert.Count > 0)
                    await _db.SaveChangesAsync();
            }

            return new ClaimDocumentResponseDto
            {
                DocID = doc.DocID,
                ClaimID = doc.ClaimID,
                UploadedByID = doc.UploadedBy,
                UploadedByName = uploader.Name,
                VerifiedByName = null,
                DocType = doc.DocType.ToString(),
                FileName = doc.FileName,
                ContentType = doc.ContentType,
                FileSize = doc.FileSize,
                FileURI = doc.FileURI,
                SHA256 = doc.SHA256,
                UploadedAt = doc.UploadedAt,
                Status = doc.Status.ToString()
            };
        }

        // ── APPEAL RESET — direct, audit-logged, tenant-scoped, atomic ────────
        // Used ONLY by the appeal-overturn flow. Bypasses any state-machine
        // validation in UpdateClaimAsync so a Rejected/Adjudicated claim can
        // be returned to Submitted state for re-processing.
        public async Task<bool> ResetClaimToSubmittedAsync(
            int claimId,
            int? userOrgId,
            int resetByUserId,
            string reason)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // Tenant-scoped lookup
                var query = _db.Claims.Where(c => c.ClaimID == claimId);
                if (userOrgId.HasValue)
                    query = query.Where(c => c.OrganizationID == userOrgId.Value);

                var claim = await query.FirstOrDefaultAsync();
                if (claim == null)
                {
                    await transaction.RollbackAsync();
                    return false;
                }

                // Capture previous state for audit
                var previousStatus = claim.Status.ToString() ?? "Unknown";

                // FORCE reset (no state-machine check)
                claim.Status = ClaimStatus.Submitted;

                // Audit log
                _db.AuditLogs.Add(new AuditLog
                {
                    UserID = resetByUserId,
                    Action = "ResetClaimAfterAppealOverturn",
                    ResourceType = "Claim",
                    ResourceID = claimId.ToString(),
                    DetailsJSON = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        claimID = claimId,
                        previousStatus = previousStatus,
                        newStatus = "Submitted",
                        reason = reason
                    }),
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                });

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET CLAIM DOCUMENTS — tenant-scoped read (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.ClaimDocuments.Where(d => d.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            return await query
                .Select(d => new ClaimDocumentResponseDto
                {
                    DocID = d.DocID,
                    ClaimID = d.ClaimID,
                    UploadedByID = d.UploadedBy,
                    UploadedByName = d.Uploader.Name,
                    VerifiedByName = d.VerifiedBy != null ? d.VerifiedBy.Name : null,
                    DocType = d.DocType.ToString(),
                    FileName = d.FileName,             // ← NEW
                    ContentType = d.ContentType,          // ← NEW
                    FileSize = d.FileSize,             // ← NEW
                    FileURI = d.FileURI,
                    SHA256 = d.SHA256,
                    UploadedAt = d.UploadedAt,
                    Status = d.Status.ToString()
                })
              
                .ToListAsync();
        }

        public async Task<ClaimDocument?> GetClaimDocumentEntityAsync(
    int claimId, int docId, int? userOrgId = null)
        {
            var query = _db.ClaimDocuments
                .Where(d => d.DocID == docId && d.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            return await query.FirstOrDefaultAsync();
        }
        // ══════════════════════════════════════════════════════════════════
        //  DELETE DOCUMENT
        // ══════════════════════════════════════════════════════════════════
        public async Task<string> DeleteDocumentAsync(
            int claimId, int docId, int requestingUserId, int? userOrgId = null)
        {
            var query = _db.ClaimDocuments
                .Where(d => d.DocID == docId && d.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            var doc = await query.FirstOrDefaultAsync();
            if (doc == null) return "notfound";

            _db.ClaimDocuments.Remove(doc);
            _db.AuditLogs.Add(new AuditLog
            {
                UserID = requestingUserId,
                Action = "DeleteDocument",
                ResourceType = "ClaimDocument",
                ResourceID = docId.ToString(),
                DetailsJSON = $"{{\"claimID\":{claimId}," +
                              $"\"docID\":{docId}," +
                              $"\"docType\":\"{doc.DocType}\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId,
            });

            await _db.SaveChangesAsync();
            return "ok";
        }

        // ══════════════════════════════════════════════════════════════════
        //  VERIFY / REJECT DOCUMENT
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimDocumentResponseDto?> VerifyDocumentAsync(
            int claimId, int docId, VerifyDocumentDto dto,
            int verifiedByUserId, int? userOrgId = null)
        {
            if (!Enum.TryParse<DocStatus>(dto.Status, out var newStatus))
                return null;

            var query = _db.ClaimDocuments
                .Where(d => d.DocID == docId && d.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            var doc = await query.FirstOrDefaultAsync();
            if (doc == null) return null;

            doc.Status = newStatus;
            doc.VerifiedByID = verifiedByUserId;

            _db.AuditLogs.Add(new AuditLog
            {
                UserID = verifiedByUserId,
                Action = $"{dto.Status}Document",
                ResourceType = "ClaimDocument",
                ResourceID = docId.ToString(),
                DetailsJSON = $"{{\"claimID\":{claimId}," +
                              $"\"docID\":{docId}," +
                              $"\"newStatus\":\"{dto.Status}\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId,
            });
            // After: doc.Status = newStatus; doc.VerifiedByID = verifiedByUserId;

            // If the doc was rejected, log it more visibly and notify
            if (newStatus == DocStatus.Rejected)
            {
                var claim = await _db.Claims.FindAsync(claimId);
                if (claim != null)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserID = claim.ProviderID,   // notify the hospital
                        ClaimID = claimId,
                        Message = $"Document #{docId} on Claim CLM-{claimId} was REJECTED by staff. " +
                                         "Re-upload a valid replacement before requesting adjudication.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Warning,
                        CreatedAt = DateTime.UtcNow,
                        Status = NotificationStatus.Unread,
                        OrganizationID = userOrgId,
                    });
                }
            }

            await _db.SaveChangesAsync();

            // ── Notify provider when their document is rejected ───────────────────────
            if (newStatus == DocStatus.Rejected)
            {
                var parentClaim = await _db.Claims.FindAsync(claimId);
                if (parentClaim != null)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserID = parentClaim.ProviderID,
                        ClaimID = claimId,
                        Message = $"Your document ({doc.DocType}) for CLM-{claimId} was rejected " +
                                         $"by insurance staff. Please re-upload a corrected document " +
                                         $"to continue processing your claim.",
                        Category = NotificationCategory.Exception,
                        Severity = NotificationSeverity.Warning,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = userOrgId,
                    });
                    await _db.SaveChangesAsync();
                }
            }

            var uploader = await _db.Users.FindAsync(doc.UploadedBy);
            var verifier = await _db.Users.FindAsync(verifiedByUserId);

            return new ClaimDocumentResponseDto
            {
                DocID = doc.DocID,
                ClaimID = doc.ClaimID,
                UploadedByID = doc.UploadedBy,
                UploadedByName = uploader?.Name ?? "Unknown",
                VerifiedByName = verifier?.Name,
                DocType = doc.DocType.ToString(),
                FileURI = doc.FileURI,
                SHA256 = doc.SHA256,
                UploadedAt = doc.UploadedAt,
                Status = doc.Status.ToString()
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET MEMBER IDS BY POLICYHOLDER — for GetClaimById access check
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<int>> GetMemberIdsByPolicyholderAsync(int policyholderUserId, int? userOrgId)
        {
            var query = _db.Members
                .Where(m => m.PolicyholderUserID == policyholderUserId);

            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            return await query
                .Select(m => m.MemberID)
                .ToListAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  VALIDATE PROCEED TO ADJUDICATION
        //  Pre-flight check before staff triggers fraud scoring + adjudication.
        //  Rules:
        //    1. Claim must exist and belong to the caller's org (tenant safety)
        //    2. Claim must be in DocsVerificationPending status
        //    3. Every attached document must be Verified or Rejected — none can be Pending
        //       (forces staff to actively review every document, not silently skip them)
        //  Returns: "ok" | "notfound" | "wrongstatus" | "pendingdocs" | "rejecteddocs" | "nodocs"
        // ══════════════════════════════════════════════════════════════════
        public async Task<string> ValidateProceedToAdjudicationAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.Claims
                .Include(c => c.ClaimDocuments)
                .Where(c => c.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();
            if (claim == null) return "notfound";

            if (claim.Status != ClaimStatus.DocsVerificationPending)
                return "wrongstatus";

            // 1. No unreviewed documents — staff must actively review every doc.
            var hasPendingDocs = claim.ClaimDocuments.Any(d => d.Status == DocStatus.Pending);
            if (hasPendingDocs) return "pendingdocs";

            // 2. No rejected documents — provider must re-upload before adjudication proceeds.
            var hasRejectedDocs = claim.ClaimDocuments.Any(d => d.Status == DocStatus.Rejected);
            if (hasRejectedDocs) return "rejecteddocs";

            // 3. At least one verified document required (if any docs exist at all).
            if (claim.ClaimDocuments.Count > 0 &&
                !claim.ClaimDocuments.Any(d => d.Status == DocStatus.Verified))
                return "nodocs";
            // No unreviewed documents allowed
            var hasPendingDocs = claim.ClaimDocuments.Any(d => d.Status == DocStatus.Pending);
            if (hasPendingDocs) return "pendingdocs";

            // ── NEW: Any rejected documents → claim must be denied ──
            var rejectedCount = claim.ClaimDocuments.Count(d => d.Status == DocStatus.Rejected);
            if (rejectedCount > 0)
                return $"hasrejecteddocs:{rejectedCount}";

            return "ok";
        }

        public async Task<string> StaffRejectClaimAsync(
        int claimId,
        string reason,
        int rejectedByUserId,
        int? userOrgId = null)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // ── Tenant-scoped lookup ──
                var query = _db.Claims.Where(c => c.ClaimID == claimId);
                if (userOrgId.HasValue)
                    query = query.Where(c => c.OrganizationID == userOrgId.Value);

                var claim = await query.FirstOrDefaultAsync();
                if (claim == null)
                {
                    await transaction.RollbackAsync();
                    return "notfound";
                }

                // Cannot reject already-finalized claims
                if (claim.Status == ClaimStatus.Approved
                    || claim.Status == ClaimStatus.Rejected
                    || claim.Status == ClaimStatus.Paid)
                {
                    await transaction.RollbackAsync();
                    return "alreadyfinalized";
                }

                var previousStatus = claim.Status;

                // ── Update claim ──
                claim.Status = ClaimStatus.Rejected;

                // ── Audit log entry ──
                _db.AuditLogs.Add(new AuditLog
                {
                    UserID = rejectedByUserId,
                    Action = "StaffRejectClaim",
                    ResourceType = "Claim",
                    ResourceID = claimId.ToString(),
                    DetailsJSON = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        claimID = claimId,
                        previousStatus = previousStatus.ToString(),
                        newStatus = "Rejected",
                        reason = reason,
                        rejectedBy = rejectedByUserId
                    }),
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                });

                // ── Notify the claim filer (provider) ──
                _db.Notifications.Add(new Notification
                {
                    UserID = claim.ProviderID,
                    ClaimID = claimId,
                    Message = $"Your claim CLM-{claimId} has been REJECTED by staff. " +
                              $"Reason: {reason}",
                    Category = NotificationCategory.Exception,
                    Severity = NotificationSeverity.Warning,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = claim.OrganizationID,
                });

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return "ok";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[StaffRejectClaim ERROR] Claim {claimId}: {ex.Message}");
                throw;
            }
        }


        public async Task<ClaimDocumentResponseDto?> ReplaceDocumentAsync(
        int claimId,
        int docId,
        ReplaceDocumentDto dto,
        int replacedByUserId,
        int? userOrgId = null)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // ── Tenant-scoped lookup ──
                var query = _db.ClaimDocuments
                    .Where(d => d.DocID == docId && d.ClaimID == claimId);

                if (userOrgId.HasValue)
                    query = query.Where(d => d.OrganizationID == userOrgId.Value);

                var doc = await query.FirstOrDefaultAsync();
                if (doc == null)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                // ── Only Rejected docs can be replaced ──
                if (doc.Status != DocStatus.Rejected)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                // ── Capture old values for audit ──
                var oldFileURI = doc.FileURI;
                var oldSHA256 = doc.SHA256;
                var oldStatus = doc.Status.ToString();

                // ── Update document in place ──
                doc.FileURI = dto.FileURI;
                doc.SHA256 = dto.SHA256;
                doc.Status = DocStatus.Pending;       // reset for re-review
                doc.VerifiedByID = null;                     // clear old rejector
                doc.UploadedBy = replacedByUserId;
                doc.UploadedAt = DateTime.UtcNow;

                // ── Audit log entry ──
                _db.AuditLogs.Add(new AuditLog
                {
                    UserID = replacedByUserId,
                    Action = "ReplaceDocument",
                    ResourceType = "ClaimDocument",
                    ResourceID = docId.ToString(),
                    DetailsJSON = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        claimID = claimId,
                        docID = docId,
                        docType = doc.DocType.ToString(),
                        oldStatus,
                        newStatus = "Pending",
                        oldFileURI,
                        newFileURI = dto.FileURI,
                        oldSHA256,
                        newSHA256 = dto.SHA256,
                        replacedBy = replacedByUserId,
                    }),
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = doc.OrganizationID,
                });

                // ── Notify in-org Staff/Admin that the doc was re-uploaded ──
                var claim = await _db.Claims.FindAsync(claimId);
                if (claim != null)
                {
                    var staff = await _db.Users
                        .Where(u =>
                            (u.Role == UserRole.InsuranceStaff || u.Role == UserRole.Admin)
                            && u.Status == AccountStatus.Active
                            && u.OrganizationID == claim.OrganizationID)
                        .ToListAsync();

                    foreach (var s in staff)
                    {
                        _db.Notifications.Add(new Notification
                        {
                            UserID = s.UserID,
                            ClaimID = claimId,
                            Message = $"A rejected document on Claim CLM-{claimId} has been " +
                                             $"re-uploaded with a corrected version ({doc.DocType}). " +
                                             "Please review.",
                            Category = NotificationCategory.Exception,
                            Severity = NotificationSeverity.Info,
                            CreatedAt = DateTime.UtcNow,
                            Status = NotificationStatus.Unread,
                            OrganizationID = claim.OrganizationID,
                        });
                    }
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                // ── Return updated DTO ──
                var uploader = await _db.Users.FindAsync(replacedByUserId);
                return new ClaimDocumentResponseDto
                {
                    DocID = doc.DocID,
                    ClaimID = doc.ClaimID,
                    UploadedByID = doc.UploadedBy,
                    UploadedByName = uploader?.Name ?? "Unknown",
                    VerifiedByName = null,                 // cleared on replace
                    DocType = doc.DocType.ToString(),
                    FileURI = doc.FileURI,
                    SHA256 = doc.SHA256,
                    UploadedAt = doc.UploadedAt,
                    Status = doc.Status.ToString(),
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[ReplaceDocument ERROR] Doc {docId}: {ex.Message}");
                throw;
            }
        }
    }
}