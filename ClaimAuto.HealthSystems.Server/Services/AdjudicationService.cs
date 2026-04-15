using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services
{
    // This service contains ONLY rule evaluation logic
    // It does NOT save anything to the database
    // It takes a claim + rules and returns a decision
    // The repository uses this service and handles all DB operations

    public class AdjudicationService
    {
        private readonly ApplicationDbContext _db;

        public AdjudicationService(ApplicationDbContext db)
        {
            _db = db;
        }

        // ── MAIN ENGINE METHOD ───────────────────────────────────────────────────
        // Takes a claim and list of active rules
        // Returns an AdjudicationResult containing the decision and all details
        // Does NOT touch the database — only reads and evaluates
        public async Task<AdjudicationResult> EvaluateClaimAsync(Claim claim, List<Rule> activeRules)
        {
            var result = new AdjudicationResult();
            var ruleTraces = new List<RuleTrace>();
            bool shouldDeny = false;
            bool routeToManual = false;

            // Start with full billed amount as payable
            // Rules will reduce this amount as they fire
            decimal payableAmount = claim.TotalBilledAmount;
            decimal deductibleApplied = 0;

            // ── EVALUATE EACH RULE IN PRIORITY ORDER ─────────────────────────────
            // Rules come in already ordered by Priority from the repository
            // R001 (Priority 1) runs first, R005 (Priority 5) runs last
            foreach (var rule in activeRules)
            {
                var trace = new RuleTrace
                {
                    RuleID = rule.RuleID,
                    RuleName = rule.Name,
                    RuleType = rule.RuleType.ToString()
                };

                // Each rule is evaluated by its name
                // This is a simple pattern matching approach
                // In a production system you'd use a proper expression evaluator
                // For MVP this is clean, readable, and fully functional
                switch (rule.Name)
                {
                    // ── R001: POLICY ACTIVE CHECK ─────────────────────────────────
                    case "Policy Active Check":
                        var policy = await _db.Policies
                            .FindAsync(claim.PolicyID);

                        if (policy != null && policy.Status == PolicyStatus.Active)
                        {
                            trace.Result = "PASS";
                            trace.Reason = $"Policy {policy.PlanCode} is Active.";
                        }
                        else
                        {
                            trace.Result = "FAIL";
                            trace.Reason = "Policy is not Active or not found.";
                            shouldDeny = true; // hard stop — deny immediately
                        }
                        break;

                    // ── R002: IN-NETWORK CHECK ────────────────────────────────────
                    case "In-Network Check":
                        // Simplified for MVP — all providers considered in-network
                        // In a real system you'd check a ProviderNetwork table
                        trace.Result = "PASS";
                        trace.Reason = "Provider is in-network (MVP: all providers accepted).";
                        break;

                    // ── R003: AMOUNT THRESHOLD ────────────────────────────────────
                    case "Amount Threshold":
                        if (claim.TotalBilledAmount <= 500000)
                        {
                            trace.Result = "PASS";
                            trace.Reason = $"₹{claim.TotalBilledAmount} is within ₹5,00,000 threshold.";
                        }
                        else
                        {
                            trace.Result = "ROUTE";
                            trace.Reason = $"₹{claim.TotalBilledAmount} exceeds threshold. Routed for manual review.";
                            routeToManual = true; // don't deny — route to human
                        }
                        break;

                    // ── R004: DUPLICATE DETECTION ─────────────────────────────────
                    case "Duplicate Detection":
                        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

                        // Check: does a claim already exist for the same
                        // member + provider + submitted within last 7 days?
                        // Exclude the current claim itself from the check
                        var duplicate = await _db.Claims
                            .AnyAsync(c =>
                                c.MemberID == claim.MemberID &&
                                c.ProviderID == claim.ProviderID &&
                                c.SubmittedAt >= sevenDaysAgo &&
                                c.ClaimID != claim.ClaimID && // exclude self
                                c.Status != ClaimStatus.Rejected); // ignore rejected

                        if (!duplicate)
                        {
                            trace.Result = "PASS";
                            trace.Reason = "No duplicate claim found in the last 7 days.";
                        }
                        else
                        {
                            trace.Result = "FAIL";
                            trace.Reason = "Duplicate claim detected within 7-day window.";
                            shouldDeny = true;
                        }
                        break;

                    // ── R005: DEDUCTIBLE APPLIED ──────────────────────────────────
                    case "Deductible Applied":
                        var policyForDeductible = await _db.Policies
                            .FindAsync(claim.PolicyID);

                        if (policyForDeductible?.DeductibleAmount > 0)
                        {
                            // MVP: Apply the full deductible amount directly
                            // In a full implementation you would calculate
                            // how much deductible the member has already met
                            // this year by parsing CalculationsJSON from past records
                            // For now we always apply the full policy deductible
                            var remainingDeductible = policyForDeductible.DeductibleAmount.Value;
                            deductibleApplied = remainingDeductible;
                            payableAmount = Math.Max(0, payableAmount - remainingDeductible);

                            trace.Result = "APPLIED";
                            trace.Reason = $"Deductible of ₹{remainingDeductible} applied. " +
                                           $"Payable reduced to ₹{payableAmount}.";
                        }
                        else
                        {
                            trace.Result = "PASS";
                            trace.Reason = "No deductible applicable for this policy.";
                        }
                        break;

                    // ── UNKNOWN RULE ──────────────────────────────────────────────
                    default:
                        // Rule exists in DB but engine doesn't know how to evaluate it
                        // Skip it and log — don't crash the entire adjudication
                        trace.Result = "SKIPPED";
                        trace.Reason = $"Rule '{rule.Name}' is not implemented in engine v1.";
                        break;
                }

                ruleTraces.Add(trace);

                // EARLY EXIT — if a hard denial rule fired, stop evaluating
                // No point running remaining rules if claim is already denied
                if (shouldDeny) break;
            }

            // ── DETERMINE FINAL DECISION ──────────────────────────────────────────
            if (shouldDeny)
            {
                result.Decision = AdjDecision.Denied;
                result.PayableAmount = 0;
            }
            else if (routeToManual)
            {
                result.Decision = AdjDecision.PendingReview;
                result.PayableAmount = 0; // no payment until human decides
            }
            else
            {
                // All rules passed — approve the claim
                result.Decision = AdjDecision.Paid;
                result.PayableAmount = payableAmount;
            }

            // ── BUILD CALCULATIONS JSON ───────────────────────────────────────────
            result.CalculationsJSON = JsonSerializer.Serialize(new
            {
                billed = claim.TotalBilledAmount,
                allowed = claim.TotalBilledAmount,   // MVP: allowed = billed
                deductibleApplied = deductibleApplied,
                copay = 0,
                payable = result.PayableAmount
            });

            // ── BUILD APPLIED RULES JSON ──────────────────────────────────────────
            result.AppliedRulesJSON = JsonSerializer.Serialize(
                ruleTraces.Select(t => new
                {
                    ruleId = t.RuleID,
                    ruleName = t.RuleName,
                    result = t.Result,
                    reason = t.Reason
                })
            );

            result.RuleTraces = ruleTraces;
            return result;
        }
    }

    // ── HELPER CLASSES ────────────────────────────────────────────────────────────
    // These are internal result objects used only within this service
    // They never go to the database or the client directly
    // The repository maps them into proper entities and DTOs

    public class AdjudicationResult
    {
        public AdjDecision Decision { get; set; }
        public decimal PayableAmount { get; set; }
        public string CalculationsJSON { get; set; } = string.Empty;
        public string AppliedRulesJSON { get; set; } = string.Empty;
        public List<RuleTrace> RuleTraces { get; set; } = new();
    }

    public class RuleTrace
    {
        public int RuleID { get; set; }
        public string RuleName { get; set; } = string.Empty;
        public string RuleType { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty; // PASS, FAIL, APPLIED, ROUTE, SKIPPED
        public string Reason { get; set; } = string.Empty;
    }
}