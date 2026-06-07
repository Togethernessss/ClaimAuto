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
        PolicyID = c.PolicyID,                       // ← needed by frontend to scope by active policy
        PolicyName = c.Policy.PlanName,
        ClaimType = c.ClaimType.ToString(),
        TotalBilledAmount = c.TotalBilledAmount,
        // ApprovedAmount populated below from the latest AdjudicationRecord
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

            var claims = await pagedQuery.ToListAsync();

            // ── Enrich ApprovedAmount from the Payments table (authoritative source) ─
            // The Payments table holds the ACTUAL payable amount that was set during
            // adjudication (auto or manual). Reading from AdjudicationRecord.CalculationsJSON
            // was unreliable because the manual adjudication path previously stored the
            // full billed amount in that JSON regardless of what staff approved.
            //
            // Strategy:
            //   1. Primary   — use the most recent non-cancelled Payment.Amount for the claim.
            //                  This is always correct: payment is created with the exact
            //                  approved/capped amount at adjudication time.
            //   2. Fallback  — if no Payment exists (e.g. claim is still pending or Denied),
            //                  parse CalculationsJSON from the latest AdjudicationRecord.
            //                  Denied claims have no payment, so ApprovedAmount stays null/0.
            if (claims.Count > 0)
            {
                var claimIds = claims.Select(c => c.ClaimID).ToList();

                // ── Primary: read from Payments ────────────────────────────────────
                // Include Pending / Authorized / Executed payments — exclude Failed and
                // OnHold (these are the "bad" states; PaymentStatus has no Cancelled value).
                var paymentsByClaim = await _db.Payments
                    .Where(p => claimIds.Contains(p.ClaimID)
                             && p.Status != PaymentStatus.Failed
                             && p.Status != PaymentStatus.OnHold)
                    .GroupBy(p => p.ClaimID)
                    .Select(g => new
                    {
                        ClaimID = g.Key,
                        Amount  = g.OrderByDescending(p => p.CreatedAt)
                                   .Select(p => (decimal?)p.Amount)
                                   .FirstOrDefault()
                    })
                    .ToDictionaryAsync(x => x.ClaimID, x => x.Amount);

                // ── Fallback: read from AdjudicationRecord.CalculationsJSON ────────
                // Only used for claims that have an adjudication record but no payment
                // (shouldn't normally happen for Approved/Paid, but handles edge cases).
                var fallbackClaimIds = claimIds
                    .Where(id => !paymentsByClaim.ContainsKey(id))
                    .ToList();

                Dictionary<int, string?> adjJsonByClaim = new();
                if (fallbackClaimIds.Count > 0)
                {
                    adjJsonByClaim = await _db.AdjudicationRecords
                        .Where(a => fallbackClaimIds.Contains(a.ClaimID))
                        .GroupBy(a => a.ClaimID)
                        .Select(g => new
                        {
                            ClaimID = g.Key,
                            Latest  = g.OrderByDescending(a => a.ExecutedAt)
                                       .Select(a => a.CalculationsJSON)
                                       .FirstOrDefault()
                        })
                        .ToDictionaryAsync(x => x.ClaimID, x => x.Latest);
                }

                foreach (var dto in claims)
                {
                    // Primary: payment amount
                    if (paymentsByClaim.TryGetValue(dto.ClaimID, out var payAmt) && payAmt.HasValue)
                    {
                        dto.ApprovedAmount = payAmt.Value;
                        continue;
                    }

                    // Fallback: parse CalculationsJSON
                    if (!adjJsonByClaim.TryGetValue(dto.ClaimID, out var calcJson)
                        || string.IsNullOrWhiteSpace(calcJson))
                        continue;

                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(calcJson);
                        var root = doc.RootElement;

                        // Try keys in priority order: auto schema → manual schema → generic
                        if (root.TryGetProperty("approvedAmount", out var approvedAmt))
                            dto.ApprovedAmount = approvedAmt.GetDecimal();
                        else if (root.TryGetProperty("payable", out var payable))
                            dto.ApprovedAmount = payable.GetDecimal();
                        else if (root.TryGetProperty("allowed", out var allowed))
                            dto.ApprovedAmount = allowed.GetDecimal();
                    }
                    catch
                    {
                        // Malformed JSON or unexpected shape — leave ApprovedAmount null
                    }
                }
            }

            return claims;
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

            // Reimbursement claim type removed — every claim must come from a Hospital
            if (provider.Role != UserRole.Hospital) return null;

            var member = await _db.Members.FindAsync(dto.MemberID);
            if (member == null) return null;

            // Validate each line's service date falls within the member's coverage period
            // and that no two lines share the same ServiceCode + ServiceDate (duplicate billing)
            if (dto.Lines != null)
            {
                var lineKeys = new HashSet<string>();
                foreach (var line in dto.Lines)
                {
                    if (line.ServiceDate.Date < member.CoverageStart.Date)
                        return null;
                    if (member.CoverageEnd.HasValue && line.ServiceDate.Date > member.CoverageEnd.Value.Date)
                        return null;

                    var key = $"{line.ServiceCode.Trim().ToUpper()}_{line.ServiceDate:yyyy-MM-dd}";
                    if (!lineKeys.Add(key))
                        return null;  // duplicate service code + date within this claim
                }
            }

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
                    Category = NotificationCategory.Claim,
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
                PolicyID = claim.PolicyID,
                PolicyName = policy.PlanName,
                ClaimType = claim.ClaimType.ToString(),
                TotalBilledAmount = claim.TotalBilledAmount,
                // ApprovedAmount left null — claim has just been submitted, not yet adjudicated
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

                // ── Notify provider when their claim is rejected ─────────────────────
                // Look up caller's role so the message correctly says "administrator"
                // vs "insurance staff" depending on who performed the rejection.
                if (claim.Status == ClaimStatus.Rejected)
                {
                    var callerRole = await _db.Users
                        .Where(u => u.UserID == updatedByUserId)
                        .Select(u => u.Role)
                        .FirstOrDefaultAsync();

                    var rejectedBy = callerRole == UserRole.Admin
                        ? "an administrator"
                        : "insurance staff";

                    _db.Notifications.Add(new Notification
                    {
                        UserID = claim.ProviderID,
                        ClaimID = claim.ClaimID,
                        Message = $"Your claim CLM-{claim.ClaimID} has been rejected by {rejectedBy}. " +
                                  $"If you believe this is incorrect, you may file an appeal.",
                        Category = NotificationCategory.Claim,
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
                PolicyID = claim.PolicyID,
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
        public async Task<string> DeleteClaimAsync(int claimId, int deletedByUserId, int? userOrgId = null, bool isHospital = false)
        {
            // Tenant-aware lookup: if userOrgId is supplied, the claim must belong to that org.
            // Cross-tenant attempts get "notfound" (don't reveal existence across tenants).
            var query = _db.Claims.Where(c => c.ClaimID == claimId);
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();
            if (claim == null) return "notfound";

            if (isHospital)
            {
                // Hospital can only delete Submitted claims they own (before staff review)
                if (claim.Status != ClaimStatus.Submitted)
                    return "notallowed";
                if (claim.ProviderID != deletedByUserId)
                    return "notfound";  // don't reveal cross-provider existence
                if ((DateTime.UtcNow - claim.SubmittedAt).TotalHours > 1)
                    return "windowexpired";  // 1-hour edit window has closed
            }
            else
            {
                // Admin can delete Rejected or Submitted claims
                if (claim.Status != ClaimStatus.Rejected && claim.Status != ClaimStatus.Submitted)
                    return "notallowed";
            }

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
            int claimId, UploadDocumentDto dto, int uploadedByUserId)
        {
            var claim = await _db.Claims.FindAsync(claimId);
            if (claim == null) return null;

            var uploader = await _db.Users.FindAsync(uploadedByUserId);
            if (uploader == null) return null;

            if (!Enum.TryParse<DocType>(dto.DocType, out var docType))
                return null;

            var doc = new ClaimDocument
            {
                ClaimID = claimId,
                UploadedBy = uploadedByUserId,
                DocType = docType,
                FileURI = dto.FileURI,
                SHA256 = dto.SHA256,
                UploadedAt = DateTime.UtcNow,
                Status = DocStatus.Pending,
                OrganizationID = claim.OrganizationID,   // ← Phase 4: inherit from parent claim
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
                        Category = NotificationCategory.Document,
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
                FileURI = doc.FileURI,
                SHA256 = doc.SHA256,
                UploadedAt = doc.UploadedAt,
                Status = doc.Status.ToString()
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET CLAIM DOCUMENTS — tenant-scoped read (Phase 4)
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.ClaimDocuments
                .Where(d => d.ClaimID == claimId);

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
                FileURI = d.FileURI,
                SHA256 = d.SHA256,
                UploadedAt = d.UploadedAt,
                Status = d.Status.ToString()
            })
            .ToListAsync();
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
                        Category = NotificationCategory.Document,
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
                    Category = NotificationCategory.Claim,
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
                            Category = NotificationCategory.Document,
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