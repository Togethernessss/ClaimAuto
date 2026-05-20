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
        //  GET ALL CLAIMS — with role-based filtering and optional filters
        // ══════════════════════════════════════════════════════════════════
        // ══════════════════════════════════════════════════════════════════
        //  GET ALL CLAIMS — with role-based + tenant filtering
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimResponseDto>> GetAllClaimsAsync(
            string? status, string? priority, int? userId, string? userRole,
            int? userOrgId = null)
        {
            var query = _db.Claims.AsQueryable();

            // ── Multi-tenant filter (Phase 3) ────────────────────────────
            // When userOrgId is supplied (from Phase 4 controllers), restrict
            // results to claims owned by that organization. When null (current
            // callers), no filter — backward compatible.
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            // ── Role-based filtering ─────────────────────────────────────
            // Hospital sees only claims they submitted
            if (userRole == "Hospital" && userId.HasValue)
                query = query.Where(c => c.ProviderID == userId.Value);
            // Policyholder sees only claims linked to their member record
            if (userRole == "Policyholder" && userId.HasValue)
            {
                var myMemberIds = await _db.Members
                .Where(m => m.PolicyholderUserID == userId.Value)
                .Select(m => m.MemberID)
                .ToListAsync();

                query = query.Where(c =>
                    c.ProviderID == userId.Value ||          // their own reimbursement claims
                    myMemberIds.Contains(c.MemberID)         // hospital claims for their members
                );
            }

            // Admin and InsuranceStaff see all claims — no filter needed

            // ── Optional status filter ───────────────────────────────────
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClaimStatus>(status, out var parsedStatus))
                query = query.Where(c => c.Status == parsedStatus);

            // ── Optional priority filter ─────────────────────────────────
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
        //  GET CLAIM BY ID — full detail with lines, documents, adjudication
        // ══════════════════════════════════════════════════════════════════
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

            // ── Multi-tenant ownership check (Phase 3) ───────────────────
            // If userOrgId is supplied and doesn't match the claim's org,
            // treat as "not found" (don't reveal cross-tenant existence).
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null) return null;

            // Get the latest adjudication record (if any)
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

                // ── Nested claim lines ───────────────────────────────
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

                // ── Nested claim documents ───────────────────────────
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

                // ── Adjudication (null if not yet adjudicated) ───────
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
        //  CHECK IF EXTERNAL CLAIM REF EXISTS — duplicate detection
        // ══════════════════════════════════════════════════════════════════
        public async Task<bool> ExternalClaimRefExistsAsync(string externalClaimRef)
        {
            return await _db.Claims
                .AnyAsync(c => c.ExternalClaimRef == externalClaimRef);
        }

        // ══════════════════════════════════════════════════════════════════
        //  SUBMIT CLAIM — hospital submits a new claim
        // ══════════════════════════════════════════════════════════════════
        public async Task<ClaimResponseDto?> SubmitClaimAsync(CreateClaimDto dto, int submittedByUserId, int? userOrgId = null)
        {
            // ── Validate Provider exists and is a Hospital ───────────────
            // Allow Hospital for regular claims, Policyholder for reimbursement
            var provider = await _db.Users.FindAsync(dto.ProviderID);
            if (provider == null) return null;

            if (dto.ClaimType == "Reimbursement")
            {
                // Policyholder submitting for out-of-pocket reimbursement
                if (provider.Role != UserRole.Policyholder) return null;
            }
            else
            {
                // Hospital submitting on behalf of patient
                if (provider.Role != UserRole.Hospital) return null;
            }

            // ── Validate Member exists ───────────────────────────────────
            var member = await _db.Members.FindAsync(dto.MemberID);
            if (member == null) return null;

            // ── Validate Policy exists and is active ─────────────────────
            var policy = await _db.Policies.FindAsync(dto.PolicyID);
            if (policy == null || policy.Status != PolicyStatus.Active)
                return null;

            // ── Parse enums from string ──────────────────────────────────
            if (!Enum.TryParse<ClaimType>(dto.ClaimType, out var claimType))
                return null;

            if (!Enum.TryParse<ClaimPriority>(dto.Priority, out var priority))
                return null;

            if (!Enum.TryParse<SourceChannel>(dto.SourceChannel, out var sourceChannel))
                return null;

            // ── Create the claim ─────────────────────────────────────────
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

            // ── Audit log ────────────────────────────────────────────────
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

            // Update ResourceID with auto-generated ClaimID
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

            // Update Priority if provided and different
            if (!string.IsNullOrEmpty(dto.Priority))
            {
                if (Enum.TryParse<ClaimPriority>(dto.Priority, out var newPriority)
                    && newPriority != claim.Priority)
                {
                    changes.Add($"Priority: '{claim.Priority}' → '{dto.Priority}'");
                    claim.Priority = newPriority;
                }
            }

            // Update Status if provided and different
            // Only InsuranceStaff/Admin can change status — enforced by controller [Authorize]
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
        //  DELETE CLAIM — only Rejected claims can be deleted
        // ══════════════════════════════════════════════════════════════════
        public async Task<string> DeleteClaimAsync(int claimId, int deletedByUserId)
        {
            var claim = await _db.Claims.FindAsync(claimId);
            if (claim == null) return "notfound";

            if (claim.Status != ClaimStatus.Rejected)
                return "notrejected";

            // Audit log before deletion
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

            // Remove related records first (foreign key constraints)
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
                LineStatus = LineStatus.Pending
            };

            _db.ClaimLines.Add(line);

            // FIX 3: AuditLog for every line added
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

            // Update ResourceID with actual LineID
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
        //  GET CLAIM LINES — returns all line items for a claim
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimLineResponseDto>> GetClaimLinesAsync(int claimId)
        {
            return await _db.ClaimLines
                .Where(l => l.ClaimID == claimId)
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
            // Check if the claim exists
            var claim = await _db.Claims.FindAsync(claimId);
            if (claim == null) return null;

            // Get uploader's name for the response
            var uploader = await _db.Users.FindAsync(uploadedByUserId);
            if (uploader == null) return null;

            // Parse DocType enum
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
                Status = DocStatus.Pending
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
        //  GET CLAIM DOCUMENTS — returns all documents for a claim
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<ClaimDocumentResponseDto>> GetClaimDocumentsAsync(int claimId)
        {
            return await _db.ClaimDocuments
                .Where(d => d.ClaimID == claimId)
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