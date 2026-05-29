using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>
    /// For reimbursement claims, checks if a hospital already billed for the same service.
    /// Prevents double-payment when member submits reimbursement after hospital filed direct claim.
    /// </summary>
    public class ReimbursementDuplicateStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.REIMBURSEMENT_DUP;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            if (ctx.Claim.ClaimType != ClaimType.Reimbursement)
                return Task.FromResult(new RuleResult { Outcome = "PASS", Reason = "Not a reimbursement claim" });

            // RecentDuplicateCount carries hospital-side claims found by the engine
            if (ctx.RecentDuplicateCount > 0)
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason = $"Hospital already filed a claim for same member/service — possible double-billing"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}
