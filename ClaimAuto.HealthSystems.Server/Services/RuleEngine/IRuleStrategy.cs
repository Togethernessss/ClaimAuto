using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine
{
    /// <summary>
    /// Context passed to a strategy. Contains everything needed to make a decision
    /// without each strategy querying the DB itself.
    /// </summary>
    public class RuleContext
    {
        public Claim Claim { get; set; } = null!;
        public Policy Policy { get; set; } = null!;
        public Member Member { get; set; } = null!;
        public User Provider { get; set; } = null!;
        public List<ClaimLine> Lines { get; set; } = new();
        public List<ClaimDocument> Documents { get; set; } = new();

        public decimal PreviouslyPaid { get; set; }
        public decimal PreviouslyDeducted { get; set; }
        public int RecentDuplicateCount { get; set; }
    }

    /// <summary>
    /// Result returned by a strategy. Engine aggregates these across all active rules
    /// to determine the final claim decision.
    /// </summary>
    public class RuleResult
    {
        /// <summary>PASS | FAIL | ROUTE | APPLIED | SKIPPED</summary>
        public string Outcome { get; set; } = "PASS";

        public string? Reason { get; set; }
        public decimal? DeductedAmount { get; set; }
        public decimal? ApprovedAmount { get; set; }
    }

    /// <summary>
    /// Every rule template has a strategy implementing this interface.
    /// Strategy looks up its parameters from rule.ConditionExpressionJSON
    /// and returns a RuleResult.
    /// </summary>
    public interface IRuleStrategy
    {
        /// <summary>The RuleTemplate constant this strategy handles.</summary>
        string TemplateKey { get; }

        Task<RuleResult> EvaluateAsync(Rule rule, RuleContext context);
    }
}