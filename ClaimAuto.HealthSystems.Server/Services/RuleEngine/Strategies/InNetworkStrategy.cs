using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Rejects out-of-network providers.</summary>
    public class InNetworkStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.IN_NETWORK;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            // Reimbursement claim type removed — In-Network Check applies to every claim now.
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
