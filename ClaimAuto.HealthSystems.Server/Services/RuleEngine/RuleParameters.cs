using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine
{
    // ─── Helper: safe param deserialization ───────────────────────────
    // Strategies should never crash on bad data. If the JSON is null,
    // empty, whitespace, or malformed, return a fresh default-constructed
    // T so the strategy can use its built-in defaults.
    public static class RuleParamHelper
    {
        public static T ParseOrDefault<T>(string? json) where T : new()
        {
            if (string.IsNullOrWhiteSpace(json)) return new T();
            try
            {
                return JsonSerializer.Deserialize<T>(json) ?? new T();
            }
            catch
            {
                return new T();
            }
        }
    }

    // ─── ConditionExpressionJSON shapes ──────────────────────────────

    public class AmountThresholdParams
    {
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }

    public class ClaimTypeParams
    {
        public List<string> Types { get; set; } = new();
    }

    public class WaitingPeriodParams
    {
        public int Days { get; set; } = 30;
    }

    public class DuplicateCheckParams
    {
        public int WindowDays { get; set; } = 7;
    }

    public class DeductibleParams
    {
        public decimal? OverrideAmount { get; set; }
    }

    public class CoPayParams
    {
        public decimal Percent { get; set; } = 10.0m;
    }

    public class RequireDocTypeParams
    {
        public List<string> RequiredTypes { get; set; } = new();
    }

    // ─── ActionExpressionJSON shape (common to all) ───────────────────

    public class RuleAction
    {
        /// <summary>Continue | Approved | Denied | Partial | PendingReview</summary>
        public string Decision { get; set; } = "Continue";

        /// <summary>For Partial: e.g., 0.7 = pay 70%.</summary>
        public decimal? ApprovalRate { get; set; }

        /// <summary>Human-readable reason shown in adjudication trace.</summary>
        public string? Reason { get; set; }
    }
}