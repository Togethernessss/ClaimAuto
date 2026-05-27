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

        public async Task<AdjudicationResponseDto?> AutoAdjudicateAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.Claims
                .Include(c => c.ClaimLines)
                .Include(c => c.Member)
                .Include(c => c.Policy)
                .Include(c => c.Provider)
                .Where(c => c.ClaimID == claimId);

            // ── Multi-tenant ownership check ──────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();

            if (claim == null) return null;

            // Accept Submitted, DocsVerificationPending, or UnderReview.
            // DocsVerificationPending is the new entry state — staff triggers adjudication
            // manually via POST /proceed-to-adjudication after verifying documents.
            if (claim.Status != ClaimStatus.Submitted &&
                claim.Status != ClaimStatus.DocsVerificationPending &&
                claim.Status != ClaimStatus.UnderReview)
            {
                return new AdjudicationResponseDto
                {
                    ClaimID = claimId,
                    Decision = "AlreadyProcessed",
                    Notes = $"Claim is already in '{claim.Status}' status."
                };
            }

            var activeRules = await _db.Rules
            .Where(r => r.Status == RuleStatus.Active &&
                        (r.OrganizationID == null ||
                            r.OrganizationID == claim.OrganizationID))
            .OrderBy(r => r.Priority)
            .ToListAsync();

            var engineResult = await _engine.EvaluateClaimAsync(claim, activeRules);

            // ── Create adjudication record ────────────────────────────────
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
                PerformedByID = null,
                DeductibleApplied = engineResult.DeductibleApplied,
                OrganizationID = claim.OrganizationID   // ← inherit from claim
            };
            _db.AdjudicationRecords.Add(adjRecord);

            // ── Update claim status ───────────────────────────────────────
            // Paid/Partial → Approved (payment pending staff execution)
            // Denied       → Rejected (final)
            // PendingReview → UnderReview (staff manual review queue)
            claim.Status = engineResult.Decision switch
            {
                AdjDecision.Paid => ClaimStatus.Approved,
                AdjDecision.Denied => ClaimStatus.Rejected,
                AdjDecision.Partial => ClaimStatus.Approved,
                AdjDecision.PendingReview => ClaimStatus.UnderReview,
                _ => claim.Status
            };

            // ── Update claim line statuses ────────────────────────────────
            foreach (var line in claim.ClaimLines)
            {
                line.LineStatus = engineResult.Decision switch
                {
                    AdjDecision.Paid => LineStatus.Approved,
                    AdjDecision.Denied => LineStatus.Denied,
                    AdjDecision.Partial => LineStatus.Approved,
                    _ => LineStatus.Pending
                };
            }

            // ── Auto-create Payment when claim is Approved ────────────────
            // Staff's only remaining step: Authorize → Execute on /payments
            if (engineResult.Decision == AdjDecision.Paid ||
                engineResult.Decision == AdjDecision.Partial)
            {
                // For Reimbursement claims the payee is the Policyholder (ProviderID = their UserID)
                // For all other claim types the payee is the Hospital provider
                var payment = new Payment
                {
                    ClaimID = claimId,
                    PayeeID = claim.ProviderID,
                    Amount = engineResult.PayableAmount,
                    Currency = claim.Currency,
                    PaymentMethod = PaymentMethod.EFT,
                    Status = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                };
                _db.Payments.Add(payment);

                // Remittance is created when staff Executes the payment (in PaymentRepository)
                // NOT here — remittance requires a reference number from the bank
            }

            // ── Audit log ─────────────────────────────────────────────────
            var systemUserId = await _db.Users
                .Where(u => u.Role == UserRole.Admin && u.Status == AccountStatus.Active)
                .Select(u => u.UserID)
                .FirstOrDefaultAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserID = systemUserId > 0 ? systemUserId : claim.ProviderID,
                Action = "AutoAdjudicate",
                ResourceType = "Claim",
                ResourceID = claimId.ToString(),
                DetailsJSON = $"{{\"decision\":\"{engineResult.Decision}\"," +
                               $"\"payable\":{engineResult.PayableAmount}," +
                               $"\"rulesEvaluated\":{activeRules.Count}}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = claim.OrganizationID,
            });

            await _db.SaveChangesAsync();

            // ── Notifications ─────────────────────────────────────────────
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

        // ── MANUAL ADJUDICATE ──────────────────────────────────────────────
        public async Task<AdjudicationResponseDto?> ManualAdjudicateAsync(
    ManualAdjudicateDto dto, int performedByUserId, int? userOrgId = null)
        {
            var query = _db.Claims
                        .Include(c => c.ClaimLines)
                        .Include(c => c.Member)
                        .Include(c => c.Provider)
                        .Include(c => c.Policy)
                        .Where(c => c.ClaimID == dto.ClaimID);

            // ── Multi-tenant ownership check ──────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(c => c.OrganizationID == userOrgId.Value);

            var claim = await query.FirstOrDefaultAsync();

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
                          note   = dto.Notes ?? "No notes provided" }
                }),
                Notes = dto.Notes ?? $"Manually adjudicated by {staffName}.",
                PerformedByID = performedByUserId,
                OrganizationID = claim.OrganizationID   // ← inherit from claim
            };
            _db.AdjudicationRecords.Add(adjRecord);

            // ── Update claim status ───────────────────────────────────────
            // Paid/Partial → Approved (not Adjudicated — Adjudicated is removed from flow)
            claim.Status = decision switch
            {
                AdjDecision.Paid => ClaimStatus.Approved,
                AdjDecision.Denied => ClaimStatus.Rejected,
                AdjDecision.Partial => ClaimStatus.Approved,
                _ => ClaimStatus.Rejected  // PendingReview from manual = Rejected
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

            // ── Auto-create Payment on Paid/Partial ───────────────────────
            var payableAmount = decision == AdjDecision.Paid || decision == AdjDecision.Partial
                ? (dto.PayableAmount ?? claim.TotalBilledAmount)
                : 0m;

            if (decision == AdjDecision.Paid || decision == AdjDecision.Partial)
            {
                _db.Payments.Add(new Payment
                {
                    ClaimID = dto.ClaimID,
                    PayeeID = claim.ProviderID,
                    Amount = payableAmount,
                    Currency = claim.Currency,
                    PaymentMethod = PaymentMethod.EFT,
                    Status = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                });
            }

            // ── Audit log ─────────────────────────────────────────────────
            _db.AuditLogs.Add(new AuditLog
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
                Timestamp = DateTime.UtcNow,
                OrganizationID = claim.OrganizationID,
            });

            await _db.SaveChangesAsync();

            await SendAdjudicationNotificationsAsync(claim, decision, payableAmount);

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
        public async Task<AdjudicationResponseDto?> GetAdjudicationAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.AdjudicationRecords
                .Include(a => a.PerformedBy)
                .Where(a => a.ClaimID == claimId);

            // ── Multi-tenant ownership check (Phase 3) ───────────────────
            if (userOrgId.HasValue)
                query = query.Where(a => a.OrganizationID == userOrgId.Value);

            var record = await query
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

        public async Task<List<RuleTraceDto>?> GetRuleTraceAsync(int claimId, int? userOrgId = null)
        {
            var query = _db.AdjudicationRecords
                .Where(a => a.ClaimID == claimId);

            if (userOrgId.HasValue)
                query = query.Where(a => a.OrganizationID == userOrgId.Value);

            var record = await query
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
                    .Deserialize<List<System.Text.Json.JsonElement>>(record.AppliedRulesJSON);

                if (rawTraces == null) return new List<RuleTraceDto>();

                return rawTraces.Select(t => new RuleTraceDto
                {
                    RuleID = t.TryGetProperty("ruleId", out var id) ? id.GetInt32() : 0,
                    RuleName = t.TryGetProperty("ruleName", out var name) ? name.GetString()! : "Unknown",
                    RuleType = t.TryGetProperty("ruleType", out var type) ? type.GetString()! : "Unknown",
                    Result = t.TryGetProperty("result", out var res) ? res.GetString()! : "Unknown",
                    Reason = t.TryGetProperty("reason", out var rsn) ? rsn.GetString()! : "No reason recorded"
                }).ToList();
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
                        Reason   = "Could not parse rule trace data."
                    }
                };
            }
        }

        // ── NOTIFICATIONS ──────────────────────────────────────────────────
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
                    providerMessage = $"Claim {claim.ExternalClaimRef} approved. " +
                                      $"Payment of ₹{payableAmount} created — pending staff authorization.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) approved. " +
                                      $"₹{payableAmount} will be paid to your provider.";
                    break;

                case AdjDecision.Partial:
                    providerMessage = $"Claim {claim.ExternalClaimRef} partially approved. " +
                                      $"Payment of ₹{payableAmount} created — pending staff authorization.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) partially approved. " +
                                      $"₹{payableAmount} will be paid to your provider.";
                    break;

                case AdjDecision.Denied:
                    providerMessage = $"Claim {claim.ExternalClaimRef} denied. " +
                                      $"Please review the adjudication decision.";
                    memberMessage = $"Your claim (Ref: {claim.ExternalClaimRef}) denied. " +
                                      $"You may file an appeal if you disagree.";
                    category = NotificationCategory.Exception;
                    severity = NotificationSeverity.Warning;
                    break;

                case AdjDecision.PendingReview:
                    // Notify staff — claim moved to UnderReview queue
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
                                       $"Billed amount ₹{claim.TotalBilledAmount} exceeds auto-adjudication threshold.",
                            Category = NotificationCategory.Exception,
                            Severity = NotificationSeverity.Warning
                        });
                    }
                    return;   // no provider/member notification for PendingReview

                default:
                    return;
            }

            bool isReimbursement = claim.ClaimType == ClaimType.Reimbursement;

            if (isReimbursement)
            {
                // For reimbursement, ProviderID = Policyholder's UserID.
                // Send ONE clear reimbursement-specific notification — no duplicate.
                var reimbMessage = decision switch
                {
                    AdjDecision.Paid => $"Your reimbursement request (CLM-{claim.ClaimID}) has been approved. " +
                                           $"₹{payableAmount:N2} will be transferred to your account after staff authorization.",
                    AdjDecision.Partial => $"Your reimbursement request (CLM-{claim.ClaimID}) has been partially approved. " +
                                           $"₹{payableAmount:N2} will be transferred to your account after staff authorization.",
                    AdjDecision.Denied => $"Your reimbursement request (CLM-{claim.ClaimID}) has been denied. " +
                                           $"You may file an appeal if you disagree with this decision.",
                    _ => $"Your reimbursement request (CLM-{claim.ClaimID}) status has been updated."
                };

                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = claim.ProviderID,   // = Policyholder for reimbursement
                    ClaimID = claim.ClaimID,
                    Message = reimbMessage,
                    Category = category,
                    Severity = severity,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                });
            }
            else
            {
                // Standard hospital claim — notify provider and member separately
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = claim.ProviderID,
                    ClaimID = claim.ClaimID,
                    Message = providerMessage,
                    Category = category,
                    Severity = severity,
                    Status = NotificationStatus.Unread,
                    CreatedAt = DateTime.UtcNow,
                    OrganizationID = claim.OrganizationID,
                });

                if (claim.Member?.PolicyholderUserID != null)
                {
                    await _notificationRepo.CreateAsync(new Notification
                    {
                        UserID = claim.Member.PolicyholderUserID.Value,
                        ClaimID = claim.ClaimID,
                        Message = memberMessage,
                        Category = category,
                        Severity = severity,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = claim.OrganizationID,
                    });
                }
            }
            // ── Notify InsuranceStaff to authorize the payment ────────────────────
            // (Only for Paid/Partial — staff must authorize before payment executes)
            if (decision == AdjDecision.Paid || decision == AdjDecision.Partial)
            {
                var staffUsers = await _db.Users
                    .Where(u => u.Role == UserRole.InsuranceStaff
                             && u.Status == AccountStatus.Active
                             && u.OrganizationID == claim.OrganizationID)
                    .ToListAsync();

                foreach (var staff in staffUsers)
                {
                    await _notificationRepo.CreateAsync(new Notification
                    {
                        UserID = staff.UserID,
                        ClaimID = claim.ClaimID,
                        Message = $"Claim {claim.ExternalClaimRef ?? $"CLM-{claim.ClaimID}"} adjudicated — " +
                                    $"{decision}. Payment of ₹{payableAmount:N2} created " +
                                    $"and is pending your authorization. Please review " +
                                    $"and authorize in the Payments module.",
                        Category = NotificationCategory.Payment,
                        Severity = NotificationSeverity.Warning,
                        Status = NotificationStatus.Unread,
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = claim.OrganizationID,
                    });
                }
            }
        }
    }
}