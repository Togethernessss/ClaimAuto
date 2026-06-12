using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services;
using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Services.RuleEngine;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AdjudicationRepository : IAdjudicationRepository
    {
        private readonly ApplicationDbContext _db;
        private readonly AdjudicationService _engine;
        private readonly INotificationRepository _notificationRepo;
        private readonly IEnumerable<IRuleStrategy> _strategies;
        private readonly ILogger<AdjudicationRepository> _logger;

        public AdjudicationRepository(
            ApplicationDbContext db,
            AdjudicationService engine,
            INotificationRepository notificationRepo,
            IEnumerable<IRuleStrategy> strategies,
            ILogger<AdjudicationRepository> logger)
        {
            _db = db;
            _engine = engine;
            _notificationRepo = notificationRepo;
            _strategies = strategies;
            _logger = logger;
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

            // ── Pre-compute aggregates needed by strategies ───────────────
            // PER-MEMBER scope: filter by both PolicyID AND MemberID so one member's
            // claims don't consume another member's deductible / coverage. Current
            // product is 1 policyholder = 1 member, but the filter is correct even
            // when a future plan supports multiple members on a policy.
            var previouslyPaid = await _db.Payments
                .Where(p => p.Status == PaymentStatus.Executed
                         && _db.Claims.Any(c => c.ClaimID == p.ClaimID
                                             && c.PolicyID == claim.PolicyID
                                             && c.MemberID == claim.MemberID))
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var previouslyDeducted = await _db.AdjudicationRecords
                .Where(a => _db.Claims.Any(c => c.ClaimID == a.ClaimID
                                             && c.PolicyID == claim.PolicyID
                                             && c.MemberID == claim.MemberID)
                         && a.DeductibleApplied > 0)
                .SumAsync(a => (decimal?)a.DeductibleApplied) ?? 0m;

            var weekAgo = DateTime.UtcNow.AddDays(-7);
            var recentDuplicates = await _db.Claims
                .Where(c => c.ClaimID != claimId
                         && c.MemberID == claim.MemberID
                         && c.ProviderID == claim.ProviderID
                         && c.SubmittedAt >= weekAgo
                         && c.Status != ClaimStatus.Rejected)
                .CountAsync();

            // Load documents separately (claim was already loaded; documents not always Included)
            var claimDocuments = await _db.ClaimDocuments
                .Where(d => d.ClaimID == claimId)
                .ToListAsync();

            var ctx = new RuleContext
            {
                Claim                = claim,
                Policy               = claim.Policy!,
                Member               = claim.Member!,
                Provider             = claim.Provider!,
                Lines                = claim.ClaimLines.ToList(),
                Documents            = claimDocuments,
                PreviouslyPaid       = previouslyPaid,
                PreviouslyDeducted   = previouslyDeducted,
                RecentDuplicateCount = recentDuplicates,
            };

            // ── Fetch active rules (org-scoped or global) ────────────────
            var activeRules = await _db.Rules
                .Where(r => r.Status == RuleStatus.Active &&
                            (r.OrganizationID == null ||
                                r.OrganizationID == claim.OrganizationID))
                .OrderBy(r => r.Priority)
                .ToListAsync();

            // ── Evaluate each rule via its template-mapped strategy ──────
            var trace          = new List<object>();
            AdjDecision decision = AdjDecision.Approved;
            decimal approved      = claim.TotalBilledAmount;
            decimal totalDeducted = 0m;
            bool hardFail        = false;

            foreach (var rule in activeRules)
            {
                var strategy = _strategies.FirstOrDefault(s => s.TemplateKey == rule.RuleType);
                if (strategy == null)
                {
                    trace.Add(new {
                        ruleId   = rule.RuleID,
                        ruleName = rule.Name,
                        ruleType = rule.RuleType,
                        result   = "SKIPPED",
                        reason   = $"No strategy registered for template '{rule.RuleType}'"
                    });
                    _logger.LogWarning(
                        "Rule {Name} (ID {Id}) has unknown template '{Tpl}' — skipped",
                        rule.Name, rule.RuleID, rule.RuleType);
                    continue;
                }

                RuleResult result;
                try
                {
                    result = await strategy.EvaluateAsync(rule, ctx);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Strategy {Strategy} threw evaluating rule {Name}",
                        strategy.GetType().Name, rule.Name);
                    trace.Add(new {
                        ruleId   = rule.RuleID,
                        ruleName = rule.Name,
                        result   = "SKIPPED",
                        reason   = $"Strategy error: {ex.Message}"
                    });
                    continue;
                }

                trace.Add(new {
                    ruleId   = rule.RuleID,
                    ruleName = rule.Name,
                    ruleType = rule.RuleType,
                    result   = result.Outcome,
                    reason   = result.Reason
                });

                switch (result.Outcome)
                {
                    case "FAIL":
                        decision = AdjDecision.Denied;
                        hardFail = true;
                        break;
                    case "ROUTE":
                        if (decision != AdjDecision.Denied)
                            decision = AdjDecision.PendingReview;
                        break;
                    case "APPLIED":
                        if (result.DeductedAmount.HasValue)
                        {
                            totalDeducted += result.DeductedAmount.Value;
                            approved      -= result.DeductedAmount.Value;
                            if (approved < claim.TotalBilledAmount && decision == AdjDecision.Approved)
                                decision = AdjDecision.Partial;
                        }
                        break;
                    // PASS or SKIPPED — keep going
                }

                if (hardFail) break;
            }

            approved = Math.Max(0m, approved);

            // ── Safety net: if no rules fired, don't auto-approve ────────
            if (activeRules.Count == 0 || trace.All(t => ((dynamic)t).result == "SKIPPED"))
            {
                decision = AdjDecision.PendingReview;
                trace.Add(new {
                    ruleName = "ENGINE_DEFAULT",
                    result   = "ROUTE",
                    reason   = "No business rules evaluated this claim — manual review required"
                });
            }

            var appliedRulesJson = JsonSerializer.Serialize(trace);
            var calculationsJson = JsonSerializer.Serialize(new
            {
                originalAmount = claim.TotalBilledAmount,
                approvedAmount = approved,
                totalDeducted
            });

            // ── Create adjudication record ────────────────────────────────
            var adjRecord = new AdjudicationRecord
            {
                ClaimID = claimId,
                ExecutedAt = DateTime.UtcNow,
                EngineVersion = "v2-template",
                Decision = decision,
                CalculationsJSON = calculationsJson,
                AppliedRulesJSON = appliedRulesJson,
                Notes = $"Auto-adjudicated via v2 engine. {activeRules.Count} rule(s) considered. " +
                        $"Decision: {decision}. Payable: ₹{approved}.",
                PerformedByID = null,
                DeductibleApplied = totalDeducted,
                OrganizationID = claim.OrganizationID   // ← inherit from claim
            };
            _db.AdjudicationRecords.Add(adjRecord);

            // ── Update claim status ───────────────────────────────────────
            // Paid/Partial → Approved (payment pending staff execution)
            // Denied       → Rejected (final)
            // PendingReview → UnderReview (staff manual review queue)
            claim.Status = decision switch
            {
                AdjDecision.Approved => ClaimStatus.Approved,
                AdjDecision.Denied => ClaimStatus.Rejected,
                AdjDecision.Partial => ClaimStatus.Approved,
                AdjDecision.PendingReview => ClaimStatus.UnderReview,
                _ => claim.Status
            };

            // ── Update claim line statuses ────────────────────────────────
            foreach (var line in claim.ClaimLines)
            {
                line.LineStatus = decision switch
                {
                    AdjDecision.Approved => LineStatus.Approved,
                    AdjDecision.Denied => LineStatus.Denied,
                    AdjDecision.Partial => LineStatus.Approved,
                    _ => LineStatus.Pending
                };
            }

            // ── Auto-create Payment when claim is Approved ────────────────
            // Staff's only remaining step: Authorize → Execute on /payments
            if (decision == AdjDecision.Approved || decision == AdjDecision.Partial)
            {
                // Payee is always the Hospital provider (Reimbursement removed)
                var payment = new Payment
                {
                    ClaimID = claimId,
                    PayeeID = claim.ProviderID,
                    Amount = approved,
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
                DetailsJSON = $"{{\"decision\":\"{decision}\"," +
                               $"\"payable\":{approved}," +
                               $"\"rulesEvaluated\":{activeRules.Count}," +
                               $"\"engineVersion\":\"v2-template\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = claim.OrganizationID,
            });

            await _db.SaveChangesAsync();

            // ── Notifications (preserved as-is) ───────────────────────────
            await SendAdjudicationNotificationsAsync(
                claim,
                decision,
                approved);

            return new AdjudicationResponseDto
            {
                AdjID = adjRecord.AdjID,
                ClaimID = claimId,
                ExecutedAt = adjRecord.ExecutedAt,
                EngineVersion = adjRecord.EngineVersion,
                Decision = decision.ToString(),
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

            // ── Resolve payable amount ────────────────────────────────────────────
            // Start from what staff requested (or full billed if not specified).
            var resolvedPayable = (decision == AdjDecision.Approved || decision == AdjDecision.Partial)
                ? (dto.PayableAmount ?? claim.TotalBilledAmount)
                : 0m;

            var coverageCapNote = "";  // appended to notes if coverage limit is enforced

            // ── Enforce policy coverage limit (SumInsured) ────────────────────────
            // This is the authoritative server-side enforcement. Even if the staff
            // enters a payableAmount > remaining coverage in the UI, we cap it here.
            // This mirrors what CoverageRemainingStrategy does for auto-adjudication.
            if ((decision == AdjDecision.Approved || decision == AdjDecision.Partial)
                && claim.Policy?.SumInsured.HasValue == true
                && claim.Policy.SumInsured.Value > 0)
            {
                // Sum all executed payments for this member + policy combination.
                var alreadyPaid = await _db.Payments
                    .Where(p => p.Status == PaymentStatus.Executed
                             && _db.Claims.Any(c => c.ClaimID == p.ClaimID
                                                 && c.PolicyID == claim.PolicyID
                                                 && c.MemberID == claim.MemberID))
                    .SumAsync(p => (decimal?)p.Amount) ?? 0m;

                var coverageRemaining = claim.Policy.SumInsured.Value - alreadyPaid;

                if (coverageRemaining <= 0)
                {
                    // Coverage fully exhausted — override to Denied regardless of staff decision.
                    decision        = AdjDecision.Denied;
                    resolvedPayable = 0m;
                    coverageCapNote = $" [System override: Policy coverage of ₹{claim.Policy.SumInsured.Value:N0} " +
                                      $"is fully exhausted (₹{alreadyPaid:N0} already claimed). " +
                                      $"Decision changed to Denied.]";
                }
                else if (resolvedPayable > coverageRemaining)
                {
                    // Requested amount exceeds remaining coverage — cap at remaining.
                    var originalPayable = resolvedPayable;
                    resolvedPayable = coverageRemaining;
                    decision        = AdjDecision.Partial;
                    coverageCapNote = $" [System: Payable reduced from ₹{originalPayable:N0} to " +
                                      $"₹{coverageRemaining:N0} — policy coverage limit enforced " +
                                      $"(₹{alreadyPaid:N0} of ₹{claim.Policy.SumInsured.Value:N0} already used).]";
                }
            }

            var calculationsJson = dto.CalculationsJSON
                ?? System.Text.Json.JsonSerializer.Serialize(new
                {
                    billed  = claim.TotalBilledAmount,
                    allowed = resolvedPayable,
                    payable = decision == AdjDecision.Denied ? 0 : resolvedPayable,
                    note    = "Manual adjudication — calculations provided by staff" + coverageCapNote,
                });

            var adjRecord = new AdjudicationRecord
            {
                ClaimID          = dto.ClaimID,
                ExecutedAt       = DateTime.UtcNow,
                EngineVersion    = "manual",
                Decision         = decision,                 // may have been overridden by coverage cap
                CalculationsJSON = calculationsJson,
                AppliedRulesJSON = System.Text.Json.JsonSerializer.Serialize(new[]
                {
                    new { source      = "Manual",
                          performedBy = staffName,
                          note        = (dto.Notes ?? "No notes provided") + coverageCapNote }
                }),
                Notes          = (dto.Notes ?? $"Manually adjudicated by {staffName}.") + coverageCapNote,
                PerformedByID  = performedByUserId,
                OrganizationID = claim.OrganizationID,
            };
            _db.AdjudicationRecords.Add(adjRecord);

            // ── Update claim status ───────────────────────────────────────
            // decision may have been changed by the coverage cap enforcement above
            claim.Status = decision switch
            {
                AdjDecision.Approved => ClaimStatus.Approved,
                AdjDecision.Denied   => ClaimStatus.Rejected,
                AdjDecision.Partial  => ClaimStatus.Approved,
                _                    => ClaimStatus.Rejected,
            };

            foreach (var line in claim.ClaimLines)
            {
                line.LineStatus = decision switch
                {
                    AdjDecision.Approved => LineStatus.Approved,
                    AdjDecision.Denied   => LineStatus.Denied,
                    AdjDecision.Partial  => LineStatus.Approved,
                    _                    => LineStatus.Pending,
                };
            }

            // ── Auto-create Payment on Approved/Partial ───────────────────
            // resolvedPayable is already capped at remaining coverage (see above)
            if (decision == AdjDecision.Approved || decision == AdjDecision.Partial)
            {
                _db.Payments.Add(new Payment
                {
                    ClaimID       = dto.ClaimID,
                    PayeeID       = claim.ProviderID,
                    Amount        = resolvedPayable,         // capped amount, not raw dto value
                    Currency      = claim.Currency,
                    PaymentMethod = PaymentMethod.EFT,
                    Status        = PaymentStatus.Pending,
                    CreatedAt     = DateTime.UtcNow,
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

            await SendAdjudicationNotificationsAsync(claim, decision, resolvedPayable);

            return new AdjudicationResponseDto
            {
                AdjID            = adjRecord.AdjID,
                ClaimID          = dto.ClaimID,
                ExecutedAt       = adjRecord.ExecutedAt,
                EngineVersion    = "manual",
                Decision         = decision.ToString(),
                CalculationsJSON = adjRecord.CalculationsJSON,
                AppliedRulesJSON = adjRecord.AppliedRulesJSON,
                Notes            = adjRecord.Notes,
                PerformedByName  = staffName
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
                case AdjDecision.Approved:
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
                    // Claim denial is a claim-status event, not a system error.
                    category = NotificationCategory.Claim;
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

            // Reimbursement removed — every claim is a Hospital claim now.
            // Notify provider (hospital) and member (policyholder) separately.
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
            // ── Notify InsuranceStaff to authorize the payment ────────────────────
            // (Only for Paid/Partial — staff must authorize before payment executes)
            if (decision == AdjDecision.Approved || decision == AdjDecision.Partial)
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