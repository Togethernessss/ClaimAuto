using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Rejects if the claim would exceed remaining policy coverage.</summary>
    public class CoverageRemainingStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.COVERAGE_LIMIT;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var sumInsured = ctx.Policy.SumInsured;
            var remaining = sumInsured - ctx.PreviouslyPaid;

            if (remaining <= 0)
                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason = $"Policy coverage exhausted (used ₹{ctx.PreviouslyPaid:N0} of ₹{sumInsured:N0})"
                });

            if (ctx.Claim.TotalBilledAmount > remaining)
                return Task.FromResult(new RuleResult
                {
                    Outcome = "ROUTE",
                    Reason = $"Claim ₹{ctx.Claim.TotalBilledAmount:N0} exceeds remaining ₹{remaining:N0}"
                });

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}