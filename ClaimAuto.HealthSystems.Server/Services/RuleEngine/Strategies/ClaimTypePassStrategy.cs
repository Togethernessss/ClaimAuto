using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Auto-approves specific claim types.</summary>
    public class ClaimTypePassStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.CLAIM_TYPE_PASS;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<ClaimTypeParams>(
                rule.ConditionExpressionJSON);

            var claimType = ctx.Claim.ClaimType.ToString();

            if (p.Types.Any(t => t.Equals(claimType, StringComparison.OrdinalIgnoreCase)))
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "PASS",
                    Reason = $"Claim type '{claimType}' auto-passed by rule"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "SKIPPED" });
        }
    }
}