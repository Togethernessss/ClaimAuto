using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Auto-approves claims whose total billed amount is below a configured limit.</summary>
    public class AmountBelowStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.AMOUNT_BELOW;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<AmountThresholdParams>(
                rule.ConditionExpressionJSON);

            var limit = p.MaxAmount ?? 5000m;

            if (ctx.Claim.TotalBilledAmount <= limit)
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "PASS",
                    Reason = $"Amount ₹{ctx.Claim.TotalBilledAmount:N0} ≤ limit ₹{limit:N0}"
                });
            }

            // Out of range — this rule doesn't apply; let other rules continue
            return Task.FromResult(new RuleResult
            {
                Outcome = "SKIPPED",
                Reason = $"Amount ₹{ctx.Claim.TotalBilledAmount:N0} > limit ₹{limit:N0}"
            });
        }
    }
}
