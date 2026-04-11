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
        public async Task<List<MemberResponseDto>> GetAllMembersAsync(int? policyId, string? status)
        {
            // Start with all members
            var query = _db.Members.AsQueryable();

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
                    Status = m.Status.ToString()
                })
                .ToListAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  GET MEMBER BY ID — returns single member with PolicyName
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> GetMemberByIdAsync(int memberId)
        {
            return await _db.Members
                .Where(m => m.MemberID == memberId)
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
                    Status = m.Status.ToString()
                })
                .FirstOrDefaultAsync();
        }

        // ══════════════════════════════════════════════════════════════════
        //  CHECK ELIGIBILITY — with TTL-based caching (300 seconds)
        // ══════════════════════════════════════════════════════════════════
        public async Task<EligibilityResponseDto?> CheckEligibilityAsync(int memberId)
        {
            // ── Step 1: Find the member with their policy ────────────────
            var member = await _db.Members
                .Include(m => m.Policy)
                .FirstOrDefaultAsync(m => m.MemberID == memberId);

            if (member == null) return null;

            // ── Step 2: Check for cached result within TTL ───────────────
            var now = DateTime.UtcNow;

            var cachedCheck = await _db.EligibilityChecks
                .Where(e => e.MemberID == memberId
                         && e.TTL != null
                         && e.CheckedAt.AddSeconds(e.TTL.Value) > now)
                .OrderByDescending(e => e.CheckedAt)
                .FirstOrDefaultAsync();

            // If valid cache exists, return it without creating a new row
            if (cachedCheck != null)
            {
                return new EligibilityResponseDto
                {
                    MemberID = memberId,
                    PolicyID = member.PolicyID,
                    Status = member.Status.ToString(),
                    RemainingBenefit = CalculateRemainingBenefit(member),
                    DeductibleMet = CalculateDeductibleMet(member),
                    PreAuthRequired = false,
                    CheckedAt = cachedCheck.CheckedAt,
                    Source = "Cached",
                    TTL = cachedCheck.TTL
                };
            }

            // ── Step 3: Run fresh eligibility check ──────────────────────
            var isEligible = member.Status == MemberStatus.Active
                          && member.Policy.Status == PolicyStatus.Active
                          && member.CoverageStart <= now
                          && (member.CoverageEnd == null || member.CoverageEnd >= now);

            var remainingBenefit = CalculateRemainingBenefit(member);
            var deductibleMet = CalculateDeductibleMet(member);

            // ── Step 4: Save the result to EligibilityChecks table ───────
            var resultJson = $"{{" +
                $"\"IsEligible\":{isEligible.ToString().ToLower()}," +
                $"\"MemberStatus\":\"{member.Status}\"," +
                $"\"PolicyStatus\":\"{member.Policy.Status}\"," +
                $"\"RemainingBenefit\":{remainingBenefit}," +
                $"\"DeductibleMet\":{deductibleMet}" +
                $"}}";

            var check = new EligibilityCheck
            {
                MemberID = memberId,
                PolicyID = member.PolicyID,
                CheckedAt = now,
                Source = "API",
                ResultJSON = resultJson,
                TTL = 300     // 5 minutes cache
            };

            _db.EligibilityChecks.Add(check);
            await _db.SaveChangesAsync();

            // ── Step 5: Return the response ──────────────────────────────
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
                TTL = 300
            };
        }

        // ══════════════════════════════════════════════════════════════════
        //  CHECK IF MEMBER NUMBER EXISTS — duplicate detection
        // ══════════════════════════════════════════════════════════════════
        public async Task<bool> MemberNumberExistsAsync(string memberNumber)
        {
            return await _db.Members
                .AnyAsync(m => m.MemberNumber == memberNumber);
        }

        // ══════════════════════════════════════════════════════════════════
        //  CREATE MEMBER — enroll under a policy
        // ══════════════════════════════════════════════════════════════════
        public async Task<MemberResponseDto?> CreateMemberAsync(CreateMemberDto dto, int createdByUserId)
        {
            // Validate that the Policy exists and is active
            var policy = await _db.Policies.FindAsync(dto.PolicyID);
            if (policy == null || policy.Status != PolicyStatus.Active)
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
                MemberNumber = dto.MemberNumber,
                ContactInfoJSON = dto.ContactInfoJSON,
                CoverageStart = dto.CoverageStart,
                Status = MemberStatus.Active     // server sets this — always Active on creation
            };

            _db.Members.Add(member);

            // Audit log — same pattern as Utkarsh's PolicyRepository
            var audit = new AuditLog
            {
                UserID = createdByUserId,
                Action = "CreateMember",
                ResourceType = "Member",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"name\":\"{dto.Name}\",\"memberNumber\":\"{dto.MemberNumber}\",\"policyId\":{dto.PolicyID}}}",
                Timestamp = DateTime.UtcNow
            };

            _db.AuditLogs.Add(audit);
            await _db.SaveChangesAsync();

            // Update ResourceID with the auto-generated MemberID
            audit.ResourceID = member.MemberID.ToString();
            await _db.SaveChangesAsync();

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
                Status = member.Status.ToString()
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

            if (dto.CoverageEnd.HasValue && dto.CoverageEnd != member.CoverageEnd)
            {
                changes.Add($"CoverageEnd: {member.CoverageEnd} → {dto.CoverageEnd}");
                member.CoverageEnd = dto.CoverageEnd;
            }

            if (dto.Status != null)
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
                    Status = member.Status.ToString()
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

        private decimal CalculateRemainingBenefit(Member member)
        {
            // Total policy limit (OutOfPocketMax)
            var policyMax = member.Policy.OutOfPocketMax ?? 0m;

            // Sum of all approved/paid claims for this member
            var totalPaid = _db.Claims
                .Where(c => c.MemberID == member.MemberID
                         && (c.Status == ClaimStatus.Adjudicated || c.Status == ClaimStatus.Paid))
                .Sum(c => (decimal?)c.TotalBilledAmount) ?? 0m;

            var remaining = policyMax - totalPaid;
            return remaining > 0 ? remaining : 0m;
        }

        private decimal CalculateDeductibleMet(Member member)
        {
            // How much the member has already paid toward their deductible
            var deductible = member.Policy.DeductibleAmount ?? 0m;

            var totalPaid = _db.Claims
                .Where(c => c.MemberID == member.MemberID
                         && (c.Status == ClaimStatus.Adjudicated || c.Status == ClaimStatus.Paid))
                .Sum(c => (decimal?)c.TotalBilledAmount) ?? 0m;

            // Return whichever is smaller — what they've paid or the full deductible
            return totalPaid >= deductible ? deductible : totalPaid;
        }
    }
}