using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services
{

    public class AdjudicationService
    {
        private readonly ApplicationDbContext _db;

        public AdjudicationService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<AdjudicationResult> EvaluateClaimAsync(Claim claim, List<Rule> activeRules)
        {
            var result = new AdjudicationResult();
            var ruleTraces = new List<RuleTrace>();
            bool shouldDeny = false;
            bool routeToManual = false;
            decimal payableAmount = claim.TotalBilledAmount;
            decimal deductibleApplied = 0;

            foreach (var rule in activeRules)
            {
                var trace = new RuleTrace
                {
                    RuleID = rule.RuleID,
                    RuleName = rule.Name,
                    RuleType = rule.RuleType.ToString()
                };

                switch (rule.Name)
                {
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
                            shouldDeny = true;
                        }
                        break;

                    case "In-Network Check":

                        trace.Result = "PASS";
                        trace.Reason = "Provider is in-network (MVP: all providers accepted).";
                        break;

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

                    case "Duplicate Detection":
                        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

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

                    case "Deductible Applied":
                        var policyForDeductible = await _db.Policies
                            .FindAsync(claim.PolicyID);

                        if (policyForDeductible?.DeductibleAmount > 0)
                        {
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

                    default:
                        trace.Result = "SKIPPED";
                        trace.Reason = $"Rule '{rule.Name}' is not implemented in engine v1.";
                        break;
                }

                ruleTraces.Add(trace);

                if (shouldDeny) break;
            }

            if (shouldDeny)
            {
                result.Decision = AdjDecision.Denied;
                result.PayableAmount = 0;
            }
            else if (routeToManual)
            {
                result.Decision = AdjDecision.PendingReview;
                result.PayableAmount = 0; 
            }
            else
            {
                result.Decision = AdjDecision.Paid;
                result.PayableAmount = payableAmount;
            }

            result.CalculationsJSON = JsonSerializer.Serialize(new
            {
                billed = claim.TotalBilledAmount,
                allowed = claim.TotalBilledAmount,   // MVP: allowed = billed
                deductibleApplied = deductibleApplied,
                copay = 0,
                payable = result.PayableAmount
            });

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