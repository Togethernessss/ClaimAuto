using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Unconditionally routes the claim to manual review.</summary>
    public class RouteToReviewStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.ROUTE_TO_REVIEW;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            return Task.FromResult(new RuleResult
            {
                Outcome = "ROUTE",
                Reason = "Always routed to manual review by configuration"
            });
        }
    }
}
