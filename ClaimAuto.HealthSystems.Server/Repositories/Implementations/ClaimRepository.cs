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
            int? userOrgId = null)
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

            return await query
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
                })
                .ToListAsync();
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
                    LineStatus = l.LineStatus.ToString()
                }).ToList(),

                ClaimDocuments = claim.ClaimDocuments.Select(d => new ClaimDocumentResponseDto
                {
                    DocID = d.DocID,
                    ClaimID = d.ClaimID,
                    UploadedByName = d.Uploader.Name,
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
                Status = ClaimStatus.Submitted,
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
                Timestamp = now
            };

            _db.AuditLogs.Add(audit);
            await _db.SaveChangesAsync();

            audit.ResourceID = claim.ClaimID.ToString();
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
        public async Task<ClaimResponseDto?> UpdateClaimAsync(int claimId, UpdateClaimDto dto, int updatedByUserId)
        {
            var claim = await _db.Claims
                .Include(c => c.Provider)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

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
                    Timestamp = DateTime.UtcNow
                };
                _db.AuditLogs.Add(audit);
                await _db.SaveChangesAsync();
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
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            var lines = await _db.ClaimLines.Where(l => l.ClaimID == claimId).ToListAsync();
            _db.ClaimLines.RemoveRange(lines);

            var docs = await _db.ClaimDocuments.Where(d => d.ClaimID == claimId).ToListAsync();
            _db.ClaimDocuments.RemoveRange(docs);

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
                Timestamp = DateTime.UtcNow
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

            return new ClaimDocumentResponseDto
            {
                DocID = doc.DocID,
                ClaimID = doc.ClaimID,
                UploadedByName = uploader.Name,
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
                    UploadedByName = d.Uploader.Name,
                    DocType = d.DocType.ToString(),
                    FileURI = d.FileURI,
                    SHA256 = d.SHA256,
                    UploadedAt = d.UploadedAt,
                    Status = d.Status.ToString()
                })
                .ToListAsync();
        }
    }
}