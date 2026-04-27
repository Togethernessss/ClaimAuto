using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AdjudicationRepository : IAdjudicationRepository
    {
        private readonly ApplicationDbContext _db;
        private readonly AdjudicationService _engine;
        private readonly INotificationRepository _notificationRepo;

        public AdjudicationRepository(
            ApplicationDbContext db, 
            AdjudicationService engine,
            INotificationRepository notificationRepo)
        {
            _db = db;
            _engine = engine;
            _notificationRepo = notificationRepo;
        }

        public async Task<AdjudicationResponseDto?> AutoAdjudicateAsync(int claimId)
        {
            var claim = await _db.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .FirstOrDefaultAsync(c => c.ClaimID == claimId);

            if (claim == null) return null;

            if (claim.Status != ClaimStatus.Submitted &&
                claim.Status != ClaimStatus.Validated)
            {
                return new AdjudicationResponseDto
                {
                    ClaimID = claimId,
                    Decision = "AlreadyProcessed",
                    Notes = $"Claim is already in '{claim.Status}' status."
                };
            }

            var activeRules = await _db.Rules
                .Where(r => r.Status == RuleStatus.Active)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            var engineResult = await _engine.EvaluateClaimAsync(claim, activeRules);

            var adjRecord = new AdjudicationRecord
            {
                ClaimID = claimId,
                ExecutedAt = DateTime.UtcNow,
                EngineVersion = "v1.0.0",
                Decision = engineResult.Decision,
                CalculationsJSON = engineResult.CalculationsJSON,
                AppliedRulesJSON = engineResult.AppliedRulesJSON,
                Notes = $"Auto-adjudicated. Decision: {engineResult.Decision}. " +
                                   $"Payable: ₹{engineResult.PayableAmount}.",
                PerformedByID = null
            };
            _db.AdjudicationRecords.Add(adjRecord);

            claim.Status = engineResult.Decision switch
            {
                AdjDecision.Paid => ClaimStatus.Adjudicated,
                AdjDecision.Denied => ClaimStatus.Rejected,
                AdjDecision.Partial => ClaimStatus.Adjudicated,
                AdjDecision.PendingReview => ClaimStatus.Submitted,
                _ => claim.Status
            };

            foreach (var line in claim.ClaimLines)
            {
                line.LineStatus = engineResult.Decision switch
                {
                    AdjDecision.Paid => LineStatus.Approved,
                    AdjDecision.Denied => LineStatus.Denied,
                    _ => LineStatus.Pending
                };
            }

            var systemUserId = await _db.Users
                .Where(u => u.Role == UserRole.Admin && u.Status == AccountStatus.Active)
                .Select(u => u.UserID)
                .FirstOrDefaultAsync();

            var audit = new AuditLog
            {
                UserID = systemUserId > 0 ? systemUserId : claim.ProviderID,
                Action = "AutoAdjudicate",
                ResourceType = "Claim",
                ResourceID = claimId.ToString(),
                DetailsJSON = $"{{\"decision\":\"{engineResult.Decision}\"," +
                               $"\"payable\":{engineResult.PayableAmount}," +
                               $"\"rulesEvaluated\":{activeRules.Count}}}",
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            await SendAdjudicationNotificationsAsync(
                claim,
                engineResult.Decision,
                engineResult.PayableAmount);

            return new AdjudicationResponseDto
            {
                AdjID = adjRecord.AdjID,
                ClaimID = claimId,
                ExecutedAt = adjRecord.ExecutedAt,
                EngineVersion = adjRecord.EngineVersion,
                Decision = adjRecord.Decision.ToString(),
                CalculationsJSON = adjRecord.CalculationsJSON,
                AppliedRulesJSON = adjRecord.AppliedRulesJSON,
                Notes = adjRecord.Notes,
                PerformedByName = "System (Auto)" 
            };
        }

        public async Task<AdjudicationResponseDto?> ManualAdjudicateAsync(
            ManualAdjudicateDto dto, int performedByUserId)
        {
            var claim = await _db.Claims
                        .Include(c => c.ClaimLines)
                        .Include(c => c.Member)
                        .Include(c => c.Provider)
                        .Include(c => c.Policy)
                        .FirstOrDefaultAsync(c => c.ClaimID == dto.ClaimID);

            if (claim == null) return null;

            if (!Enum.TryParse<AdjDecision>(dto.Decision, true, out var decision))
                decision = AdjDecision.Denied; 

            var staffName = await _db.Users
                .Where(u => u.UserID == performedByUserId)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "Unknown Staff";


            var calculationsJson = dto.CalculationsJSON
                ?? System.Text.Json.JsonSerializer.Serialize(new
                {
                    billed = claim.TotalBilledAmount,
                    allowed = claim.TotalBilledAmount,
                    payable = decision == AdjDecision.Denied ? 0 : claim.TotalBilledAmount,
                    note = "Manual adjudication — calculations provided by staff"
                });

            var adjRecord = new AdjudicationRecord
            {
                ClaimID = dto.ClaimID,
                ExecutedAt = DateTime.UtcNow,
                EngineVersion = "manual",      
                Decision = decision,
                CalculationsJSON = calculationsJson,
                AppliedRulesJSON = System.Text.Json.JsonSerializer.Serialize(new[]
                {
                    new { source = "Manual", performedBy = staffName,
                          note = dto.Notes ?? "No notes provided" }
                }),
                Notes = dto.Notes ?? $"Manually adjudicated by {staffName}.",
                PerformedByID = performedByUserId  
            };
            _db.AdjudicationRecords.Add(adjRecord);


            claim.Status = decision switch
            {
                AdjDecision.Paid => ClaimStatus.Adjudicated,
                AdjDecision.Denied => ClaimStatus.Rejected,
                AdjDecision.Partial => ClaimStatus.Adjudicated,
                _ => ClaimStatus.Adjudicated
            };


            foreach (var line in claim.ClaimLines)
            {
                line.LineStatus = decision switch
                {
                    AdjDecision.Paid => LineStatus.Approved,
                    AdjDecision.Denied => LineStatus.Denied,
                    AdjDecision.Partial => LineStatus.Approved,
                    _ => LineStatus.Pending
                };
            }

            var audit = new AuditLog
            {
                UserID = performedByUserId,
                Action = "ManualAdjudicate",
                ResourceType = "Claim",
                ResourceID = dto.ClaimID.ToString(),
                DetailsJSON = System.Text.Json.JsonSerializer.Serialize(new
                {
                    decision = decision.ToString(),
                    performedBy = staffName,
                    notes = dto.Notes,
                    claimStatus = claim.Status.ToString()
                }),
                Timestamp = DateTime.UtcNow
            };
            _db.AuditLogs.Add(audit);

            await _db.SaveChangesAsync();

            await SendAdjudicationNotificationsAsync(
                claim,
                decision,
                decision == AdjDecision.Paid
                    ? claim.TotalBilledAmount
                    : 0);

            return new AdjudicationResponseDto
            {
                AdjID = adjRecord.AdjID,
                ClaimID = dto.ClaimID,
                ExecutedAt = adjRecord.ExecutedAt,
                EngineVersion = "manual",
                Decision = decision.ToString(),
                CalculationsJSON = adjRecord.CalculationsJSON,
                AppliedRulesJSON = adjRecord.AppliedRulesJSON,
                Notes = adjRecord.Notes,
                PerformedByName = staffName 
            };
        }
        public async Task<AdjudicationResponseDto?> GetAdjudicationAsync(int claimId)
        {
            var record = await _db.AdjudicationRecords
                .Include(a => a.PerformedBy)
                .Where(a => a.ClaimID == claimId)
                .OrderByDescending(a => a.ExecutedAt)
                .FirstOrDefaultAsync();

            if (record == null) return null;

            return new AdjudicationResponseDto
            {
                AdjID = record.AdjID,
                ClaimID = record.ClaimID,
                ExecutedAt = record.ExecutedAt,
                EngineVersion = record.EngineVersion,
                Decision = record.Decision.ToString(),
                CalculationsJSON = record.CalculationsJSON,
                AppliedRulesJSON = record.AppliedRulesJSON,
                Notes = record.Notes,
                PerformedByName = record.PerformedBy?.Name ?? "System (Auto)"
            };
        }

        public async Task<List<RuleTraceDto>?> GetRuleTraceAsync(int claimId)
        {
            var record = await _db.AdjudicationRecords
                .Where(a => a.ClaimID == claimId)
                .OrderByDescending(a => a.ExecutedAt)
                .FirstOrDefaultAsync();

            if (record == null) return null;

            if (record.EngineVersion == "manual")
            {
                return new List<RuleTraceDto>
                {
                    new RuleTraceDto
                    {
                        RuleID   = 0,
                        RuleName = "Manual Decision",
                        RuleType = "Override",
                        Result   = record.Decision.ToString(),
                        Reason   = record.Notes ?? "Manually adjudicated by staff."
                    }
                };
            }
            if (string.IsNullOrEmpty(record.AppliedRulesJSON))
                return new List<RuleTraceDto>();

            try
            {
                var rawTraces = System.Text.Json.JsonSerializer
                    .Deserialize<List<System.Text.Json.JsonElement>>(
                        record.AppliedRulesJSON);

                if (rawTraces == null)
                    return new List<RuleTraceDto>();

                var traces = rawTraces.Select(t => new RuleTraceDto
                {
                    RuleID = t.TryGetProperty("ruleId", out var id) ? id.GetInt32() : 0,
                    RuleName = t.TryGetProperty("ruleName", out var name) ? name.GetString()! : "Unknown",
                    RuleType = t.TryGetProperty("ruleType", out var type) ? type.GetString()! : "Unknown",
                    Result = t.TryGetProperty("result", out var res) ? res.GetString()! : "Unknown",
                    Reason = t.TryGetProperty("reason", out var rsn) ? rsn.GetString()! : "No reason recorded"
                }).ToList();

                return traces;
            }
            catch
            {
                return new List<RuleTraceDto>
                {
                    new RuleTraceDto
                    {
                        RuleID   = 0,
                        RuleName = "Parse Error",
                        RuleType = "System",
                        Result   = "ERROR",
                        Reason   = "Could not parse rule trace data. " +
                                   "Raw data available in AppliedRulesJSON."
                    }
                };
            }

        }

        private async Task SendAdjudicationNotificationsAsync(
            Claim claim,
            AdjDecision decision,
            decimal payableAmount)
        {
            string providerMessage;
            string memberMessage;
            var category = NotificationCategory.Payment;
            var severity = NotificationSeverity.Info;

            switch (decision)
            {
                case AdjDecision.Paid:
                    providerMessage = $"Claim {claim.ExternalClaimRef} has been approved. " +
                                      $"Payment of ₹{payableAmount} is being processed.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) " +
                                      $"has been approved. " +
                                      $"₹{payableAmount} will be paid to your provider.";
                    category = NotificationCategory.Payment;
                    severity = NotificationSeverity.Info;
                    break;

                case AdjDecision.Denied:
                    providerMessage = $"Claim {claim.ExternalClaimRef} has been denied. " +
                                      $"Please review the adjudication decision.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) " +
                                      $"has been denied. " +
                                      $"You may file an appeal if you disagree.";
                    category = NotificationCategory.Exception;
                    severity = NotificationSeverity.Warning;
                    break;

                case AdjDecision.Partial:
                    providerMessage = $"Claim {claim.ExternalClaimRef} partially approved. " +
                                      $"Payment of ₹{payableAmount} is being processed.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) " +
                                      $"was partially approved. " +
                                      $"₹{payableAmount} will be paid to your provider.";
                    category = NotificationCategory.Payment;
                    severity = NotificationSeverity.Info;
                    break;

                case AdjDecision.PendingReview:

                    var staffUser = await _db.Users
                        .Where(u => u.Role == UserRole.InsuranceStaff
                                 && u.Status == AccountStatus.Active)
                        .FirstOrDefaultAsync();

                    if (staffUser != null)
                    {
                        await _notificationRepo.CreateAsync(new Notification
                        {
                            UserID = staffUser.UserID,
                            ClaimID = claim.ClaimID,
                            Message = $"Claim {claim.ExternalClaimRef} requires manual review. " +
                                       $"Billed amount ₹{claim.TotalBilledAmount} " +
                                       $"exceeds auto-adjudication threshold.",
                            Category = NotificationCategory.Exception,
                            Severity = NotificationSeverity.Warning
                        });
                    }
                    return;

                default:
                    return;
            }

            await _notificationRepo.CreateAsync(new Notification
            {
                UserID = claim.ProviderID,
                ClaimID = claim.ClaimID,
                Message = providerMessage,
                Category = category,
                Severity = severity
            });

            var memberUser = await _db.Users
                .Where(u => u.Name == claim.Member.Name
                         && u.Role == UserRole.Policyholder
                         && u.Status == AccountStatus.Active)
                .FirstOrDefaultAsync();

            if (memberUser != null)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = memberUser.UserID,
                    ClaimID = claim.ClaimID,
                    Message = memberMessage,
                    Category = category,
                    Severity = severity
                });
            }
        }
    }
}
