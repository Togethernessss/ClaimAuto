using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Detects duplicate claims (same member+provider within N days).</summary>
    public class DuplicateCheckStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.DUPLICATE_CHECK;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            // RecentDuplicateCount is populated by AdjudicationRepository before evaluation
            if (ctx.RecentDuplicateCount > 0)
            {
                var p = RuleParamHelper.ParseOrDefault<DuplicateCheckParams>(
                    rule.ConditionExpressionJSON);

                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason = $"Duplicate detected — {ctx.RecentDuplicateCount} similar claim(s) in last {p.WindowDays} days"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}