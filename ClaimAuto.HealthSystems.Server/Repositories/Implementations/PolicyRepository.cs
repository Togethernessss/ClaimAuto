using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class PolicyRepository : IPolicyRepository
    {
        private readonly ApplicationDbContext _db;

        public PolicyRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<PolicyResponseDto>> GetAllPoliciesAsync(int? userOrgId = null)
        {
            var query = _db.Policies.AsQueryable();

            // ── Multi-tenant filter (Phase 3) ────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(p => p.OrganizationID == userOrgId.Value);

            return await query
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    SumInsured = p.SumInsured,
                    DeductibleAmount = p.DeductibleAmount,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),

                    MemberCount = _db.Members.Count(mbox => mbox.PolicyID == p.PolicyID)
                }).ToListAsync();
        }

        public async Task<List<PolicyResponseDto>> GetActivePoliciesAsync(int? userOrgId = null)
        {
            var today = DateTime.UtcNow;
            var query = _db.Policies
                .Where(p =>
                    p.Status == Model.PolicyStatus.Active &&
                    p.EffectiveFrom <= today &&
                    (p.EffectiveTo == null || p.EffectiveTo >= today)
                );

            // ── Multi-tenant filter (Phase 3)
            if (userOrgId.HasValue)
                query = query.Where(p => p.OrganizationID == userOrgId.Value);

            return await query
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    SumInsured = p.SumInsured,
                    DeductibleAmount = p.DeductibleAmount,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),
                    MemberCount = _db.Members.Count(m => m.PolicyID == p.PolicyID)
                })
                .ToListAsync();
        }

        public async Task<PolicyResponseDto?> GetPolicyByIdAsync(int policyId, int? userOrgId = null)
        {
            var query = _db.Policies.Where(p => p.PolicyID == policyId);

            // ── Multi-tenant ownership check (Phase 3) ───────────────────
            if (userOrgId.HasValue)
                query = query.Where(p => p.OrganizationID == userOrgId.Value);

            return await query
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    SumInsured = p.SumInsured,
                    DeductibleAmount = p.DeductibleAmount,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),

                    MemberCount = _db.Members.Count(m => m.PolicyID == p.PolicyID)
                })
                .FirstOrDefaultAsync();
        }

        // ── CHECK IF PLANCODE EXISTS
        public async Task<bool> PlanCodeExistsAsync(string planCode)
        {
            return await _db.Policies
                .AnyAsync(p => p.PlanCode == planCode);
        }

        public async Task<PolicyResponseDto> CreatePolicyAsync(CreatePolicyDto dto, int createdByUserId, int? userOrgId = null)
        {

            var policy = new Policy
            {
                PlanCode = dto.PlanCode,
                PlanName = dto.PlanName,
                CoverageRulesJSON = dto.CoverageRulesJSON,
                SumInsured = dto.SumInsured,
                DeductibleAmount = dto.DeductibleAmount,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                Status = PolicyStatus.Active,
                OrganizationID = userOrgId,    // ← Phase 4: tenant stamp
            };

            _db.Policies.Add(policy);

            var audit = new AuditLog
            {
                UserID = createdByUserId,          
                Action = "CreatePolicy",
                ResourceType = "Policy",
                ResourceID = "PENDING",
                DetailsJSON = $"{{\"planCode\":\"{dto.PlanCode}\",\"planName\":\"{dto.PlanName}\"}}",
                Timestamp = DateTime.UtcNow
            };

            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            audit.ResourceID = policy.PolicyID.ToString();
            await _db.SaveChangesAsync();

            return new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode ?? string.Empty,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                SumInsured = policy.SumInsured,
                DeductibleAmount = policy.DeductibleAmount,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = 0
            };
        }

        public async Task<PolicyResponseDto?> UpdatePolicyAsync(int policyId, UpdatePolicyDto dto, int updatedByUserId)
        {
            var policy = await _db.Policies.FindAsync(policyId);
            if (policy == null) return null;

            var changes = new List<string>();

            if (dto.PlanName != null && dto.PlanName != policy.PlanName)
            {
                changes.Add($"PlanName: '{policy.PlanName}' → '{dto.PlanName}'");
                policy.PlanName = dto.PlanName;
            }

            if (dto.CoverageRulesJSON != null)
            {
                changes.Add("CoverageRulesJSON updated");
                policy.CoverageRulesJSON = dto.CoverageRulesJSON;
            }

            if (dto.SumInsured.HasValue && dto.SumInsured != policy.SumInsured)
            {
                changes.Add($"SumInsured: {policy.SumInsured} → {dto.SumInsured}");
                policy.SumInsured = dto.SumInsured;
            }

            if (dto.DeductibleAmount.HasValue && dto.DeductibleAmount != policy.DeductibleAmount)
            {
                changes.Add($"DeductibleAmount: {policy.DeductibleAmount} → {dto.DeductibleAmount}");
                policy.DeductibleAmount = dto.DeductibleAmount;
            }

            if (dto.EffectiveTo.HasValue && dto.EffectiveTo != policy.EffectiveTo)
            {
                changes.Add($"EffectiveTo: {policy.EffectiveTo} → {dto.EffectiveTo}");
                policy.EffectiveTo = dto.EffectiveTo;
            }
            if (dto.Status != null)
            {
                if (Enum.TryParse<PolicyStatus>(dto.Status, out var newStatus)
                    && newStatus != policy.Status)
                {
                    // RULE: Expired is a TERMINAL state.
                    // Once a policy is Expired, NO status change is allowed.
                    // This blocks ALL paths: Expired→Active, Expired→Suspended etc.
                    if (policy.Status == PolicyStatus.Expired)
                    {
                        // Return null → controller returns 400 Bad Request
                        return null;
                    }

                    changes.Add($"Status: '{policy.Status}' → '{dto.Status}'");
                    policy.Status = newStatus;
                }
            }

            if (!changes.Any())
            {
                return new PolicyResponseDto
                {
                    PolicyID = policy.PolicyID,
                    PlanCode = policy.PlanCode ?? string.Empty,
                    PlanName = policy.PlanName,
                    CoverageRulesJSON = policy.CoverageRulesJSON,
                    SumInsured = policy.SumInsured,
                    DeductibleAmount = policy.DeductibleAmount,
                    EffectiveFrom = policy.EffectiveFrom,
                    EffectiveTo = policy.EffectiveTo,
                    Status = policy.Status.ToString(),
                    MemberCount = _db.Members.Count(m => m.PolicyID == policy.PolicyID)
                };
            }

            var audit = new AuditLog
            {
                UserID = updatedByUserId,
                Action = "UpdatePolicy",
                ResourceType = "Policy",
                ResourceID = policyId.ToString(),
                DetailsJSON = $"{{\"changes\": [{string.Join(", ", changes.Select(c => $"\"{c}\""))}]}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return new PolicyResponseDto
            {
                PolicyID = policy.PolicyID,
                PlanCode = policy.PlanCode ?? string.Empty,
                PlanName = policy.PlanName,
                CoverageRulesJSON = policy.CoverageRulesJSON,
                SumInsured = policy.SumInsured,
                DeductibleAmount = policy.DeductibleAmount,
                EffectiveFrom = policy.EffectiveFrom,
                EffectiveTo = policy.EffectiveTo,
                Status = policy.Status.ToString(),
                MemberCount = _db.Members.Count(m => m.PolicyID == policy.PolicyID)
            };
        }

        public async Task<string> DeactivatePolicyAsync(int policyId, int deactivatedByUserId)
        {
            var policy = await _db.Policies.FindAsync(policyId);
            if (policy == null) return "notfound";

            if (policy.Status == PolicyStatus.Expired)
                return "alreadyexpired";

            var hasActiveMembers = await _db.Members
                .AnyAsync(m => m.PolicyID == policyId
                            && m.Status == MemberStatus.Active);

            if (hasActiveMembers) return "hasmembers";

            policy.Status = PolicyStatus.Expired;

            var audit = new AuditLog
            {
                UserID = deactivatedByUserId,
                Action = "DeactivatePolicy",
                ResourceType = "Policy",
                ResourceID = policyId.ToString(),
                DetailsJSON = $"{{\"planCode\":\"{policy.PlanCode}\"," +
                               $"\"reason\":\"Soft deleted — Status set to Expired\"}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            return "ok";
        }

        public async Task<object> AutoExpirePoliciesAsync()
        {
            var now = DateTime.UtcNow;

            // Find Admin to send notifications to
            var adminUser = await _db.Users
                .Where(u => u.Role == UserRole.Admin
                         && u.Status == AccountStatus.Active)
                .FirstOrDefaultAsync();

            int expiredCount = 0;
            int warned7DayCount = 0;
            int warned2HourCount = 0;

            // ── ALREADY EXPIRED ───────────────────────────────────────────────────
            // Active policies whose EffectiveTo has already passed
            var expiredPolicies = await _db.Policies
                .Where(p => p.Status == PolicyStatus.Active
                         && p.EffectiveTo != null
                         && p.EffectiveTo < now)
                .ToListAsync();

            foreach (var policy in expiredPolicies)
            {
                policy.Status = PolicyStatus.Expired;
                expiredCount++;

                _db.AuditLogs.Add(new AuditLog
                {
                    UserID = adminUser?.UserID ?? 1,
                    Action = "AutoExpirePolicy",
                    ResourceType = "Policy",
                    ResourceID = policy.PolicyID.ToString(),
                    DetailsJSON = $"{{\"planCode\":\"{policy.PlanCode}\"," +
                                   $"\"effectiveTo\":\"{policy.EffectiveTo:yyyy-MM-dd}\"," +
                                   $"\"reason\":\"Auto-expired — EffectiveTo date passed\"}}",
                    Timestamp = now
                });

                if (adminUser != null)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserID = adminUser.UserID,
                        ClaimID = null,
                        Message = $"Policy '{policy.PlanCode}' ({policy.PlanName}) " +
                                    $"has been automatically expired. " +
                                    $"Effective To date was " +
                                    $"{policy.EffectiveTo:dd MMM yyyy}.",
                        Category = NotificationCategory.Policy,
                        Severity = NotificationSeverity.Warning,
                        Status = NotificationStatus.Unread,
                        CreatedAt = now
                    });
                }
            }

            // ── 7-DAY WARNING ─────────────────────────────────────────────────────
            // Send warning the FIRST TIME Admin opens dashboard
            // when policy is within 7 days of expiry.
            //
            // Logic: EffectiveTo <= now + 7 days  (already within range)
            //        AND NotifiedAt7Days is null  (not sent yet)
            var expiringSoon7Day = await _db.Policies
                .Where(p => p.Status == PolicyStatus.Active
                         && p.EffectiveTo != null
                         && p.EffectiveTo > now              // not expired yet
                         && p.EffectiveTo <= now.AddDays(7)  // within 7 days
                         && p.NotifiedAt7Days == null)        // not sent yet
                .ToListAsync();

            foreach (var policy in expiringSoon7Day)
            {
                // Lock it — will never send this notification again
                policy.NotifiedAt7Days = now;
                warned7DayCount++;

                if (adminUser != null)
                {
                    // Calculate how many days remain for a clear message
                    var daysLeft = (policy.EffectiveTo.Value - now).Days;
                    var dayWord = daysLeft == 1 ? "day" : "days";

                    _db.Notifications.Add(new Notification
                    {
                        UserID = adminUser.UserID,
                        ClaimID = null,
                        Message = $"Policy '{policy.PlanCode}' ({policy.PlanName}) " +
                                    $"is expiring in {daysLeft} {dayWord} on " +
                                    $"{policy.EffectiveTo:dd MMM yyyy}. " +
                                    $"Please review and take action if needed.",
                        Category = NotificationCategory.Policy,
                        Severity = NotificationSeverity.Warning,
                        Status = NotificationStatus.Unread,
                        CreatedAt = now
                    });
                }
            }

            // ── 2-HOUR WARNING ────────────────────────────────────────────────────
            // Send warning the FIRST TIME Admin opens dashboard
            // when policy is within 2 hours of expiry.
            //
            // Logic: EffectiveTo <= now + 2 hours  (already within range)
            //        AND NotifiedAt2Hours is null  (not sent yet)

            var expiringSoon2Hour = await _db.Policies
                .Where(p => p.Status == PolicyStatus.Active
                         && p.EffectiveTo != null
                         && p.EffectiveTo > now                   // not expired yet
                         && p.EffectiveTo <= now.AddHours(2)      // within 2 hours
                         && p.NotifiedAt2Hours == null)            // not sent yet
                .ToListAsync();

            foreach (var policy in expiringSoon2Hour)
            {
                // Lock it — will never send this notification again
                policy.NotifiedAt2Hours = now;
                warned2HourCount++;

                if (adminUser != null)
                {
                    // Calculate exact minutes remaining
                    var minutesLeft = (int)(policy.EffectiveTo.Value - now).TotalMinutes;
                    var timeWord = minutesLeft >= 60
                        ? $"{minutesLeft / 60} hour{(minutesLeft / 60 > 1 ? "s" : "")}"
                        : $"{minutesLeft} minute{(minutesLeft > 1 ? "s" : "")}";

                    _db.Notifications.Add(new Notification
                    {
                        UserID = adminUser.UserID,
                        ClaimID = null,
                        Message = $"URGENT: Policy '{policy.PlanCode}' " +
                                    $"({policy.PlanName}) is expiring in " +
                                    $"{timeWord} at " +
                                    $"{policy.EffectiveTo:dd MMM yyyy HH:mm} UTC. " +
                                    $"Take immediate action if renewal is required.",
                        Category = NotificationCategory.Policy,
                        Severity = NotificationSeverity.Critical,
                        Status = NotificationStatus.Unread,
                        CreatedAt = now
                    });
                }
            }

            // Save all changes in one transaction
            if (expiredCount > 0 || warned7DayCount > 0 || warned2HourCount > 0)
                await _db.SaveChangesAsync();

            return new
            {
                expired = expiredCount,
                warned7Day = warned7DayCount,
                warned2Hour = warned2HourCount,
                message = $"{expiredCount} expired, " +
                              $"{warned7DayCount} 7-day warnings, " +
                              $"{warned2HourCount} 2-hour warnings sent.",
                checkedAt = now
            };
        }

        public async Task<List<PolicyResponseDto>> GetPoliciesForPolicyholderAsync(
            int policyholderUserId,
            int? userOrgId = null,
            bool activeOnly = false)
        {
            var today = DateTime.UtcNow;

            var memberQuery = _db.Members
                .Where(m => m.PolicyholderUserID == policyholderUserId);

            if (activeOnly)
                memberQuery = memberQuery.Where(m => m.Status == MemberStatus.Active);

            var policyIds = memberQuery.Select(m => m.PolicyID).Distinct();

            var policyQuery = _db.Policies
                .Where(p => policyIds.Contains(p.PolicyID));

            if (userOrgId.HasValue)
                policyQuery = policyQuery.Where(p => p.OrganizationID == userOrgId.Value);

            if (activeOnly)
            {
                policyQuery = policyQuery.Where(p =>
                    p.Status == PolicyStatus.Active &&
                    p.EffectiveFrom <= today &&
                    (p.EffectiveTo == null || p.EffectiveTo >= today));
            }

            return await policyQuery
                .Select(p => new PolicyResponseDto
                {
                    PolicyID = p.PolicyID,
                    PlanCode = p.PlanCode ?? string.Empty,
                    PlanName = p.PlanName,
                    CoverageRulesJSON = p.CoverageRulesJSON,
                    SumInsured = p.SumInsured,
                    DeductibleAmount = p.DeductibleAmount,
                    EffectiveFrom = p.EffectiveFrom,
                    EffectiveTo = p.EffectiveTo,
                    Status = p.Status.ToString(),
                    MemberCount = _db.Members.Count(m => m.PolicyID == p.PolicyID),
                })
                .ToListAsync();
        }

    }
}
