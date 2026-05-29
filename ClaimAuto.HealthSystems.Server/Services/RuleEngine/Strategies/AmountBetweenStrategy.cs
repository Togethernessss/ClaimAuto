using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Custom decision when claim amount is within a configured range.</summary>
    public class AmountBetweenStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.AMOUNT_BETWEEN;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<AmountThresholdParams>(
                rule.ConditionExpressionJSON);

            var min = p.MinAmount ?? 0m;
            var max = p.MaxAmount ?? decimal.MaxValue;

            if (ctx.Claim.TotalBilledAmount >= min && ctx.Claim.TotalBilledAmount <= max)
            {
                var action = RuleParamHelper.ParseOrDefault<RuleAction>(
                    rule.ActionExpressionJSON);

                var outcome = action.Decision switch
                {
                    "Denied" => "FAIL",
                    "PendingReview" => "ROUTE",
                    // Accept both new ("Approved") and legacy ("Paid") synonyms.
                    "Approved" or "Paid" => "PASS",
                    _ => "PASS"
                };

                return Task.FromResult(new RuleResult
                {
                    Outcome = outcome,
                    Reason = action.Reason ?? $"Amount in range ₹{min:N0}-₹{max:N0}"
                });
            }

            return Task.FromResult(new RuleResult
            {
                Outcome = "SKIPPED",
                Reason = $"Amount ₹{ctx.Claim.TotalBilledAmount:N0} outside range ₹{min:N0}-₹{max:N0}"
            });
        }
    }
}