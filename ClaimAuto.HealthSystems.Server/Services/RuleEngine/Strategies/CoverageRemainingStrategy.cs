using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>
    /// Enforces the policy's SumInsured (total coverage limit) per member per policy period.
    ///
    /// Decision logic:
    ///   SumInsured null/zero → PASS  (no limit configured — do not block)
    ///   remaining ≤ 0        → FAIL  (coverage exhausted — hard deny)
    ///   billed  > remaining  → APPLIED with DeductedAmount = (billed − remaining)
    ///                          Engine caps payable at remaining; decision becomes Partial.
    ///   billed ≤ remaining   → PASS  (fully within coverage)
    ///
    /// Previously returned "ROUTE" when billed exceeded remaining, which only sent the
    /// claim to manual review without enforcing the financial cap. Staff could then
    /// approve the full billed amount, bypassing the coverage limit entirely.
    /// </summary>
    public class CoverageRemainingStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.COVERAGE_LIMIT;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            // ── Guard: SumInsured not configured ─────────────────────────────
            // null or zero means the policy has no stated annual/period coverage cap.
            // Comparing decimal? with 0 is safe: null > 0 is false, so both conditions
            // collapse to the same guard. We skip the check rather than blocking.
            if (!ctx.Policy.SumInsured.HasValue || ctx.Policy.SumInsured.Value <= 0)
                return Task.FromResult(new RuleResult
                {
                    Outcome = "PASS",
                    Reason  = "No sum insured limit configured on this policy — coverage cap check skipped.",
                });

            // Unwrap safely — HasValue confirmed above, no nullable arithmetic from here on.
            var sumInsured = ctx.Policy.SumInsured.Value;
            var remaining  = sumInsured - ctx.PreviouslyPaid;

            // ── Coverage fully exhausted ──────────────────────────────────────
            if (remaining <= 0)
                return Task.FromResult(new RuleResult
                {
                    Outcome = "FAIL",
                    Reason  = $"Policy coverage exhausted. " +
                              $"₹{ctx.PreviouslyPaid:N0} already claimed against " +
                              $"₹{sumInsured:N0} sum insured — no remaining benefit.",
                });

            // ── Claim exceeds remaining coverage ──────────────────────────────
            // Return APPLIED so the engine automatically caps the approved amount
            // at the remaining limit and records a Partial decision.
            // DeductedAmount = the excess that is NOT covered by the policy.
            if (ctx.Claim.TotalBilledAmount > remaining)
            {
                var excess = ctx.Claim.TotalBilledAmount - remaining;
                return Task.FromResult(new RuleResult
                {
                    Outcome        = "APPLIED",
                    DeductedAmount = excess,
                    Reason         = $"Claim ₹{ctx.Claim.TotalBilledAmount:N0} exceeds remaining " +
                                     $"coverage ₹{remaining:N0} of ₹{sumInsured:N0}. " +
                                     $"Payable capped at ₹{remaining:N0}. " +
                                     $"Excess ₹{excess:N0} is not covered.",
                });
            }

            // ── Claim is within remaining coverage ────────────────────────────
            return Task.FromResult(new RuleResult
            {
                Outcome = "PASS",
                Reason  = $"Claim ₹{ctx.Claim.TotalBilledAmount:N0} is within " +
                          $"remaining coverage ₹{remaining:N0} of ₹{sumInsured:N0}.",
            });
        }
    }
}