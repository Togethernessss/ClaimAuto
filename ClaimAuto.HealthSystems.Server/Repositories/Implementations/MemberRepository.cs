using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class MemberRepository : IMemberRepository
    {
        private readonly ApplicationDbContext _db;

        public MemberRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET ALL MEMBERS — with optional filters for PolicyID and Status
        // ══════════════════════════════════════════════════════════════════
        public async Task<List<MemberResponseDto>> GetAllMembersAsync(int? policyId, string? status, int? userOrgId = null, int? providerUserId = null)
        {
            // Start with all members
            var query = _db.Members.AsQueryable();

            // ── Multi-tenant filter ──────────────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            // ── Hospital filter: only members they have submitted claims for ──
            if (providerUserId.HasValue)
            {
                var patientMemberIds = await _db.Claims
                    .Where(c => c.ProviderID == providerUserId.Value)
                    .Select(c => c.MemberID)
                    .Distinct()
                    .ToListAsync();
                query = query.Where(m => patientMemberIds.Contains(m.MemberID));
            }

            // Apply PolicyID filter if provided
            if (policyId.HasValue)
                query = query.Where(m => m.PolicyID == policyId.Value);

            // Apply Status filter if provided (parse string to enum)
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<MemberStatus>(status, out var parsedStatus))
                query = query.Where(m => m.Status == parsedStatus);

            return await query
                .Select(m => new MemberResponseDto
                {
                    MemberID = m.MemberID,
                    PolicyID = m.PolicyID,
                    PolicyName = m.Policy.PlanName,       // resolved via navigation
                    Name = m.Name,
                    DOB = m.DOB,
                    Gender = m.Gender.ToString(),
                    MemberNumber = m.MemberNumber,
                    ContactInfoJSON = m.ContactInfoJSON,
                    CoverageStart = m.CoverageStart,
                    CoverageEnd = m.CoverageEnd,
                    Status = m.Status.ToString(),
                    PolicyholderUserID = m.PolicyholderUserID,
                })
                .ToListAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET MEMBER BY ID — returns single member with PolicyName
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> GetMemberByIdAsync(int memberId, int? userOrgId = null)
        {
            var query = _db.Members.Where(m => m.MemberID == memberId);

            // ── Multi-tenant ownership check (Phase 3) ───────────────────
            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            return await query
                .Select(m => new MemberResponseDto
                { 
                    MemberID = m.MemberID,
                    PolicyID = m.PolicyID,
                    PolicyName = m.Policy.PlanName,
                    Name = m.Name,
                    DOB = m.DOB,
                    Gender = m.Gender.ToString(),
                    MemberNumber = m.MemberNumber,
                    ContactInfoJSON = m.ContactInfoJSON,
                    CoverageStart = m.CoverageStart,
                    CoverageEnd = m.CoverageEnd,
                    Status = m.Status.ToString(),
                    PolicyholderUserID = m.PolicyholderUserID,
                })
                .FirstOrDefaultAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  CHECK ELIGIBILITY — with TTL-based caching (300 seconds)
        // ══════════════════════════════════════════════════════════════════
        public async Task<EligibilityResponseDto?> CheckEligibilityAsync(int memberId, int? userOrgId = null)
        {
            var now = DateTime.UtcNow;

            // ── Step 1: Check for cached result within TTL ───────────────────
            
            var cachedCheck = await _db.EligibilityChecks
                .Where(e => e.MemberID == memberId
                         && e.TTL != null
                         && e.CheckedAt.AddSeconds(e.TTL.Value) > now)
                .OrderByDescending(e => e.CheckedAt)
                .FirstOrDefaultAsync();

            if (cachedCheck != null)
            {
                var cachedMember = await _db.Members
                    .Include(m => m.Policy)
                    .FirstOrDefaultAsync(m => m.MemberID == memberId);

                if (cachedMember == null) return null;

                var isEligibleCached = cachedCheck.ResultJSON?.Contains("\"IsEligible\":true") ?? false;

                return new EligibilityResponseDto
                {
                    MemberID = memberId,
                    PolicyID = cachedMember.PolicyID,
                    Status = isEligibleCached ? "Eligible" : "NotEligible",
                    RemainingBenefit = ExtractRemainingBenefitFromCache(cachedCheck.ResultJSON),
                    DeductibleMet = ExtractDeductibleMetFromCache(cachedCheck.ResultJSON),
                    PreAuthRequired = false,
                    CheckedAt = cachedCheck.CheckedAt,
                    Source = "Cached",
                    TTL = cachedCheck.TTL,
                    Reason = ExtractReasonFromCache(cachedCheck.ResultJSON)  // ← already there ✅
                };
            }

            // ── Step 2: Load member + policy + claims in ONE query ───────────

            var member = await _db.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == memberId);

            if (member == null) return null;

            // ── Step 3: Load claims for this member in ONE query ────────────

            var memberClaims = await _db.Claims
                .Where(c => c.MemberID == memberId
                         && (c.Status == ClaimStatus.Approved   // payment created, money committed
                          || c.Status == ClaimStatus.Paid))      // payment fully executed
                .Select(c => c.TotalBilledAmount)
                .ToListAsync();

            // ── Step 4: Calculate both values in MEMORY using the loaded list

            var totalPaid = memberClaims.Sum();    // sum all approved/paid claim amounts

            var policyMax = member.Policy.OutOfPocketMax ?? 0m;
            var deductible = member.Policy.DeductibleAmount ?? 0m;

            // RemainingBenefit = PolicyMax - TotalPaid (minimum 0)
            var remainingBenefit = Math.Max(policyMax - totalPaid, 0m);

            // DeductibleMet = how much of deductible has been used (capped at full deductible)
            var deductibleMet = Math.Min(totalPaid, deductible);

            // ── Step 5: Check eligibility conditions ────────────────────────
            // Build reasons list for Not Eligible cases
            var reasons = new List<string>();

            if (member.Status != MemberStatus.Active)
                reasons.Add($"Member is {member.Status}");

            if (member.Policy.Status != PolicyStatus.Active)
                reasons.Add($"Policy is {member.Policy.Status}");

            if (member.CoverageStart > now)
                reasons.Add($"Coverage has not started yet (starts {member.CoverageStart:dd MMM yyyy})");

            if (member.CoverageEnd != null && member.CoverageEnd < now)
                reasons.Add($"Coverage ended on {member.CoverageEnd:dd MMM yyyy}");

            var isEligible = !reasons.Any();
            var reason = isEligible ? "All conditions met" : string.Join(", ", reasons);

            // ── Step 6: Save fresh result to EligibilityChecks table ────────
            var resultJson = $"{{" +
                $"\"IsEligible\":{isEligible.ToString().ToLower()}," +
                $"\"MemberStatus\":\"{member.Status}\"," +
                $"\"PolicyStatus\":\"{member.Policy.Status}\"," +
                $"\"RemainingBenefit\":{remainingBenefit}," +
                $"\"DeductibleMet\":{deductibleMet}," +    // ← comma here is fine
                $"\"Reason\":\"{reason}\"" +               // ← ADD Reason
                $"}}";

            var check = new EligibilityCheck
            {
                MemberID = memberId,
                PolicyID = member.PolicyID,
                CheckedAt = now,
                Source = "API",
                ResultJSON = resultJson,
                TTL = 300,
                OrganizationID = userOrgId,   // ← stamp the org
            };

            _db.EligibilityChecks.Add(check);
            await _db.SaveChangesAsync();

            // ── Step 7: Return the response ──────────────────────────────────
            return new EligibilityResponseDto
            {
                MemberID = memberId,
                PolicyID = member.PolicyID,
                Status = isEligible ? "Eligible" : "NotEligible",
                RemainingBenefit = remainingBenefit,
                DeductibleMet = deductibleMet,
                PreAuthRequired = false,
                CheckedAt = now,
                Source = "API",
                TTL = 300,
                Reason = reason,
            };
        }        


        // ══════════════════════════════════════════════════════════════════
        //  CREATE MEMBER — enroll under a policy
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> CreateMemberAsync(CreateMemberDto dto, int createdByUserId, int? userOrgId = null)
        {

            // Validate that the Policy exists, is active, AND belongs to the same org
            var policy = await _db.Policies.FindAsync(dto.PolicyID);
            if (policy == null || policy.Status != PolicyStatus.Active)
                return null;

            // Multi-tenant guard: prevent cross-org enrollment
            if (userOrgId.HasValue && policy.OrganizationID != userOrgId)
                return null;

            // Parse the Gender enum from the string in DTO
            if (!Enum.TryParse<GenderType>(dto.Gender, out var gender))
                return null;

            var member = new Member
            {
                PolicyID = dto.PolicyID,
                Name = dto.Name,
                DOB = dto.DOB,
                Gender = gender,
                MemberNumber = null,          // auto-generated after first save
                ContactInfoJSON = dto.ContactInfoJSON,
                CoverageStart = dto.CoverageStart,
                CoverageEnd = dto.CoverageEnd,
                Status = MemberStatus.Active,
                PolicyholderUserID = dto.PolicyholderUserID,
                OrganizationID = userOrgId,
            };

            _db.Members.Add(member);

            // Audit log
            var audit = new AuditLog
            {
                UserID = createdByUserId,
                Action = "CreateMember",
                ResourceType = "Member",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"name\":\"{dto.Name}\",\"policyId\":{dto.PolicyID},\"policyholderUserID\":{dto.PolicyholderUserID}}}",
                Timestamp = DateTime.UtcNow
            };

            _db.AuditLogs.Add(audit);
            await _db.SaveChangesAsync();    // ← First save: gets auto-assigned MemberID

            // Auto-generate MemberNumber from the database-assigned MemberID
            // Format: MEM-000001, MEM-000042, MEM-100523 — guaranteed unique, no manual input
            member.MemberNumber = $"MEM-{member.MemberID:D6}";
            audit.ResourceID = member.MemberID.ToString();
            await _db.SaveChangesAsync();    // ← Second save: writes MemberNumber + ResourceID

            return new MemberResponseDto
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                PolicyName = policy.PlanName,
                Name = member.Name,
                DOB = member.DOB,
                Gender = member.Gender.ToString(),
                MemberNumber = member.MemberNumber,
                ContactInfoJSON = member.ContactInfoJSON,
                CoverageStart = member.CoverageStart,
                CoverageEnd = member.CoverageEnd,
                Status = member.Status.ToString(),
                PolicyholderUserID = member.PolicyholderUserID,
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  UPDATE MEMBER — only mutable fields
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> UpdateMemberAsync(int memberId, UpdateMemberDto dto, int updatedByUserId)
        {
            var member = await _db.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == memberId);

            if (member == null) return null;

            // Track changes for audit log — same pattern as Utkarsh
            var changes = new List<string>();

            if (dto.Name != null && dto.Name != member.Name)
            {
                changes.Add($"Name: '{member.Name}' → '{dto.Name}'");
                member.Name = dto.Name;
            }

            if (dto.ContactInfoJSON != null)
            {
                changes.Add("ContactInfoJSON updated");
                member.ContactInfoJSON = dto.ContactInfoJSON;
            }

            if (dto.CoverageEnd != member.CoverageEnd)
            {
                changes.Add($"CoverageEnd: {member.CoverageEnd} → {dto.CoverageEnd}");
                member.CoverageEnd = dto.CoverageEnd;  // null clears it, value sets it
            }

            // Status — allow setting to any valid value including re-activating
            if (!string.IsNullOrEmpty(dto.Status))
            {
                if (Enum.TryParse<MemberStatus>(dto.Status, out var newStatus)
                    && newStatus != member.Status)
                {
                    changes.Add($"Status: '{member.Status}' → '{dto.Status}'");
                    member.Status = newStatus;
                }
            }

            // If nothing changed, return current state without saving
            if (!changes.Any())
            {
                return new MemberResponseDto
                {
                    MemberID = member.MemberID,
                    PolicyID = member.PolicyID,
                    PolicyName = member.Policy.PlanName,
                    Name = member.Name,
                    DOB = member.DOB,
                    Gender = member.Gender.ToString(),
                    MemberNumber = member.MemberNumber,
                    ContactInfoJSON = member.ContactInfoJSON,
                    CoverageStart = member.CoverageStart,
                    CoverageEnd = member.CoverageEnd,
                    Status = member.Status.ToString(),
                    PolicyholderUserID = member.PolicyholderUserID,
                };
            }

            // Audit log with change details
            var audit = new AuditLog
            {
                UserID = updatedByUserId,
                Action = "UpdateMember",
                ResourceType = "Member",
                ResourceID = memberId.ToString(),
                DetailsJSON = $"{{\"changes\": [{string.Join(", ", changes.Select(c => $"\"{c}\""))}]}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            // Clear cache when status OR coverageEnd changes
            if (dto.Status != null || dto.CoverageEnd.HasValue)
            {
                var cachedChecks = await _db.EligibilityChecks
                    .Where(e => e.MemberID == memberId)
                    .ToListAsync();

                if (cachedChecks.Any())
                    _db.EligibilityChecks.RemoveRange(cachedChecks);
            }

            await _db.SaveChangesAsync();

            return new MemberResponseDto
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                PolicyName = member.Policy.PlanName,
                Name = member.Name,
                DOB = member.DOB,
                Gender = member.Gender.ToString(),
                MemberNumber = member.MemberNumber,
                ContactInfoJSON = member.ContactInfoJSON,
                CoverageStart = member.CoverageStart,
                CoverageEnd = member.CoverageEnd,
                Status = member.Status.ToString()
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  PRIVATE HELPERS — calculate benefit and deductible values
        // ══════════════════════════════════════════════════════════════════

        private decimal ExtractRemainingBenefitFromCache(string? resultJson)
        {
            // Safely parse RemainingBenefit from stored JSON string
            // Example JSON: {"IsEligible":true,"RemainingBenefit":95000,"DeductibleMet":5000}
            if (string.IsNullOrEmpty(resultJson)) return 0m;

            try
            {
                // Find "RemainingBenefit": and read the number after it
                var key = "\"RemainingBenefit\":";
                var start = resultJson.IndexOf(key);
                if (start == -1) return 0m;

                start += key.Length;
                var end = resultJson.IndexOfAny(new[] { ',', '}' }, start);
                if (end == -1) return 0m;

                var valueStr = resultJson.Substring(start, end - start).Trim();
                return decimal.TryParse(valueStr, out var value) ? value : 0m;
            }
            catch
            {
                return 0m;
            }
        }

        private decimal ExtractDeductibleMetFromCache(string? resultJson)
        {
            // Same pattern — parse DeductibleMet from stored JSON string
            if (string.IsNullOrEmpty(resultJson)) return 0m;

            try
            {
                var key = "\"DeductibleMet\":";
                var start = resultJson.IndexOf(key);
                if (start == -1) return 0m;

                start += key.Length;
                var end = resultJson.IndexOfAny(new[] { ',', '}' }, start);
                if (end == -1) return 0m;

                var valueStr = resultJson.Substring(start, end - start).Trim();
                return decimal.TryParse(valueStr, out var value) ? value : 0m;
            }
            catch
            {
                return 0m;
            }
        }

        public async Task<object> AutoExpireMembersAsync(int? userOrgId = null)
        {
            var now = DateTime.UtcNow;

            var query = _db.Members
                .Where(m => m.Status == MemberStatus.Active
                         && m.CoverageEnd != null
                         && m.CoverageEnd < now);

            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            var expiredMembers = await query.ToListAsync();

            if (!expiredMembers.Any())
                return new { expired = 0, message = "No members to expire." };

            foreach (var member in expiredMembers)
            {
                member.Status = MemberStatus.Inactive;

                _db.AuditLogs.Add(new AuditLog
                {
                    UserID = 0,
                    Action = "AutoExpireMember",
                    ResourceType = "Member",
                    ResourceID = member.MemberID.ToString(),
                    DetailsJSON = $"{{\"memberNumber\":\"{member.MemberNumber}\"," +
                                   $"\"coverageEnd\":\"{member.CoverageEnd:yyyy-MM-dd}\"," +
                                   $"\"reason\":\"Auto-expired — CoverageEnd date passed\"}}",
                    Timestamp = now
                });
            }

            await _db.SaveChangesAsync();

            return new
            {
                expired = expiredMembers.Count,
                message = $"{expiredMembers.Count} " +
                          $"{(expiredMembers.Count == 1 ? "member" : "members")} " +
                          $"auto-expired.",
            };
        }


        // ══════════════════════════════════════════════════════════════════
        //  GET MEMBER BY POLICYHOLDER USER ID
        //  Used by: GET /api/members/my — Policyholder's own member record
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> GetMemberByPolicyholderUserIdAsync(
            int userId, int? userOrgId = null)
        {
            var query = _db.Members
                .Where(m => m.PolicyholderUserID == userId);

            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            return await query
                .Select(m => new MemberResponseDto
                {
                    MemberID = m.MemberID,
                    PolicyID = m.PolicyID,
                    PolicyName = m.Policy.PlanName,
                    Name = m.Name,
                    DOB = m.DOB,
                    Gender = m.Gender.ToString(),
                    MemberNumber = m.MemberNumber,
                    ContactInfoJSON = m.ContactInfoJSON,
                    CoverageStart = m.CoverageStart,
                    CoverageEnd = m.CoverageEnd,
                    Status = m.Status.ToString(),
                    PolicyholderUserID = m.PolicyholderUserID,
                })
                .FirstOrDefaultAsync();
        }


        // ══════════════════════════════════════════════════════════════════
        //  GET MEMBER BY NUMBER — Hospital patient lookup for claim submission
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> GetMemberByNumberAsync(string memberNumber, int? userOrgId = null)
        {
            var query = _db.Members
                .Where(m => m.MemberNumber == memberNumber);

            if (userOrgId.HasValue)
                query = query.Where(m => m.OrganizationID == userOrgId.Value);

            return await query
                .Select(m => new MemberResponseDto
                {
                    MemberID = m.MemberID,
                    PolicyID = m.PolicyID,
                    PolicyName = m.Policy.PlanName,
                    Name = m.Name,
                    DOB = m.DOB,
                    Gender = m.Gender.ToString(),
                    MemberNumber = m.MemberNumber,
                    ContactInfoJSON = m.ContactInfoJSON,
                    CoverageStart = m.CoverageStart,
                    CoverageEnd = m.CoverageEnd,
                    Status = m.Status.ToString(),
                    PolicyholderUserID = m.PolicyholderUserID,
                })
                .FirstOrDefaultAsync();
        }

        private string ExtractReasonFromCache(string? resultJson)
        {
            if (string.IsNullOrEmpty(resultJson)) return "Unknown";
            try
            {
                var key = "\"Reason\":\"";
                var start = resultJson.IndexOf(key);
                if (start == -1) return "Unknown";
                start += key.Length;
                var end = resultJson.IndexOf("\"", start);
                if (end == -1) return "Unknown";
                return resultJson.Substring(start, end - start);
            }
            catch { return "Unknown"; }
        }
    }
}