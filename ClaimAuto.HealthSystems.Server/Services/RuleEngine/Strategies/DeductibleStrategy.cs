using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Applies policy deductible to the claim, reducing the payable amount.</summary>
    public class DeductibleStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.DEDUCTIBLE;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<DeductibleParams>(
                rule.ConditionExpressionJSON);

            decimal deductibleTotal = p.OverrideAmount ?? ctx.Policy.DeductibleAmount ?? 0m;
            if (deductibleTotal <= 0)
                return Task.FromResult(new RuleResult { Outcome = "PASS", Reason = "No deductible" });

            decimal alreadyConsumed = ctx.PreviouslyDeducted;
            decimal remaining = deductibleTotal - alreadyConsumed;

            if (remaining <= 0)
                return Task.FromResult(new RuleResult { Outcome = "PASS", Reason = "Deductible already fulfilled" });

            decimal toDeduct = Math.Min(remaining, ctx.Claim.TotalBilledAmount);

            return Task.FromResult(new RuleResult
            {
                Outcome = "APPLIED",
                DeductedAmount = toDeduct,
                Reason = $"Deductible of ₹{toDeduct:N0} applied (₹{deductibleTotal:N0} total, ₹{alreadyConsumed:N0} used)"
            });
        }
    }
}
