using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Applies a configured co-pay percentage to the claim.</summary>
    public class CoPayStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.COPAY;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<CoPayParams>(
                rule.ConditionExpressionJSON);

            var copay = ctx.Claim.TotalBilledAmount * (p.Percent / 100m);

            return Task.FromResult(new RuleResult
            {
                Outcome = "APPLIED",
                DeductedAmount = copay,
                Reason = $"Co-pay of {p.Percent}% (₹{copay:N0}) applied"
            });
        }
    }
}
