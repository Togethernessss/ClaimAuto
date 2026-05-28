using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Rejects out-of-network providers. Reimbursement claims skip this.</summary>
    public class InNetworkStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.IN_NETWORK;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            // Reimbursement claims bypass this check
            if (ctx.Claim.ClaimType == ClaimType.Reimbursement)
                return Task.FromResult(new RuleResult { Outcome = "PASS", Reason = "Reimbursement — skipped" });

            if (ctx.Provider?.IsInNetwork == true)
                return Task.FromResult(new RuleResult { Outcome = "PASS", Reason = "Provider is in-network" });

            return Task.FromResult(new RuleResult
            {
                Outcome = "FAIL",
                Reason = "Provider is not in-network"
            });
        }
    }
}