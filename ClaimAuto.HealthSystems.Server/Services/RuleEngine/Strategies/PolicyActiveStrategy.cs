using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Rejects claims if the policy is not Active.</summary>
    public class PolicyActiveStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.POLICY_ACTIVE;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var isActive = ctx.Policy.Status == PolicyStatus.Active;

            return Task.FromResult(isActive
                ? new RuleResult { Outcome = "PASS", Reason = "Policy is Active" }
                : new RuleResult { Outcome = "FAIL", Reason = $"Policy status is '{ctx.Policy.Status}', not Active" });
        }
    }
}