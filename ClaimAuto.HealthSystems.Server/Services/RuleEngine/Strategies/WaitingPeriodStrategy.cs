using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Rejects claims filed within X days of policy effective date.</summary>
    public class WaitingPeriodStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.WAITING_PERIOD;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<WaitingPeriodParams>(
                rule.ConditionExpressionJSON);

            var waitUntil = ctx.Policy.EffectiveFrom.AddDays(p.Days);

            if (ctx.Claim.SubmittedAt < waitUntil)
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason = $"Submitted before {p.Days}-day waiting period ended ({waitUntil:yyyy-MM-dd})"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}