using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
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
            var ruleTraces = new List<RuleTraceDto>();
            bool shouldDeny = false;
            bool routeToManual = false;
            decimal payableAmount = claim.TotalBilledAmount;
            decimal deductibleApplied = 0;

            foreach (var rule in activeRules)
            {
                var trace = new RuleTraceDto
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
                            routeToManual = true;
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
                    case "Reimbursement Duplicate Check":
                        // Only applies to reimbursement claims — all others pass through
                        if (claim.ClaimType != ClaimType.Reimbursement)
                        {
                            trace.Result = "PASS";
                            trace.Reason = "Not a reimbursement claim — check not applicable.";
                            break;
                        }

                        // If the same member already has a non-rejected, non-reimbursement
                        // claim (Inpatient / Outpatient / Pharmacy / Emergency) within 7 days,
                        // the hospital has already billed the insurer for the same episode.
                        // Filing a reimbursement ON TOP of that = double payment.
                        var reimb7Days = DateTime.UtcNow.AddDays(-7);
                        var hasConflictingClaim = await _db.Claims
                            .AnyAsync(c => c.MemberID == claim.MemberID
                                        && c.ClaimID != claim.ClaimID
                                        && c.ClaimType != ClaimType.Reimbursement
                                        && c.SubmittedAt >= reimb7Days
                                        && c.Status != ClaimStatus.Rejected);

                        if (hasConflictingClaim)
                        {
                            trace.Result = "FAIL";
                            trace.Reason = "Member already has an active hospital claim submitted within " +
                                           "the last 7 days. Filing a reimbursement for the same period " +
                                           "would result in double payment for the same episode.";
                            shouldDeny = true;
                        }
                        else
                        {
                            trace.Result = "PASS";
                            trace.Reason = "No conflicting active hospital claims in the last 7 days. " +
                                           "Reimbursement is eligible.";
                        }
                        break;

                    case "Coverage Remaining Check":
                        var policyForCoverage = await _db.Policies.FindAsync(claim.PolicyID);

                        if (policyForCoverage?.SumInsured == null || policyForCoverage.SumInsured <= 0)
                        {
                            // No coverage limit configured on this policy — allow through
                            trace.Result = "PASS";
                            trace.Reason = "No coverage limit (sum insured) configured for this policy.";
                            break;
                        }

                        // Total of all non-failed payments already raised against this policy
                        // (includes pending and authorized — conservative: counts committed payments)
                        var totalUtilized = await (
                            from p in _db.Payments
                            join c in _db.Claims on p.ClaimID equals c.ClaimID
                            where c.PolicyID == claim.PolicyID
                               && c.ClaimID != claim.ClaimID          // exclude current claim
                               && p.Status != PaymentStatus.Failed     // only count active payments
                            select p.Amount
                        ).SumAsync(a => (decimal?)a) ?? 0m;

                        var remainingCoverage = policyForCoverage.SumInsured.Value - totalUtilized;

                        if (remainingCoverage <= 0)
                        {
                            trace.Result = "FAIL";
                            trace.Reason = $"Policy coverage fully exhausted. " +
                                           $"Sum insured: ₹{policyForCoverage.SumInsured:N0}. " +
                                           $"Total utilized: ₹{totalUtilized:N0}. " +
                                           $"No remaining coverage available.";
                            shouldDeny = true;
                        }
                        else if (claim.TotalBilledAmount > remainingCoverage)
                        {
                            trace.Result = "ROUTE";
                            trace.Reason = $"Claimed ₹{claim.TotalBilledAmount:N0} exceeds remaining coverage " +
                                           $"₹{remainingCoverage:N0} " +
                                           $"(utilized ₹{totalUtilized:N0} of ₹{policyForCoverage.SumInsured:N0}). " +
                                           $"Routed for manual review — partial approval may apply.";
                            routeToManual = true;
                        }
                        else
                        {
                            trace.Result = "PASS";
                            trace.Reason = $"Coverage available: ₹{remainingCoverage:N0} remaining " +
                                           $"(utilized ₹{totalUtilized:N0} of " +
                                           $"₹{policyForCoverage.SumInsured:N0}).";
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
                allowed = claim.TotalBilledAmount,
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
        public List<RuleTraceDto> RuleTraces { get; set; } = new();
    }
}