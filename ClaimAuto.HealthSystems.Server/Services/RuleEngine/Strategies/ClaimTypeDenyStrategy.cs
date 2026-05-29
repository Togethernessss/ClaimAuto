using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Denies claims of specific types (e.g., cosmetic, experimental).</summary>
    public class ClaimTypeDenyStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.CLAIM_TYPE_DENY;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<ClaimTypeParams>(
                rule.ConditionExpressionJSON);

            var claimType = ctx.Claim.ClaimType.ToString();

            if (p.Types.Any(t => t.Equals(claimType, StringComparison.OrdinalIgnoreCase)))
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason = $"Claim type '{claimType}' is denied by rule"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}