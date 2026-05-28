using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Routes high-value claims to manual review.</summary>
    public class AmountAboveStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.AMOUNT_ABOVE;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<AmountThresholdParams>(
                rule.ConditionExpressionJSON);

            var threshold = p.MinAmount ?? 500000m;

            if (ctx.Claim.TotalBilledAmount > threshold)
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "ROUTE",
                    Reason = $"High-value (₹{ctx.Claim.TotalBilledAmount:N0} > ₹{threshold:N0}) — manual review"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}