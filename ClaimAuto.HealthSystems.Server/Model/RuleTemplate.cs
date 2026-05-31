namespace ClaimAuto.HealthSystems.Server.Model
{
    /// <summary>
    /// Built-in rule template identifiers.
    /// Each constant maps to one strategy class in Services/RuleEngine/Strategies/.
    /// Admin-created rules MUST use one of these as their RuleType.
    /// Adding a new template = adding a constant + a strategy class.
    /// </summary>
    public static class RuleTemplate
    {
        // ── Coverage / eligibility ──────────────────────────────────
        public const string POLICY_ACTIVE = "PolicyActive";
        public const string IN_NETWORK = "InNetwork";
        public const string WAITING_PERIOD = "WaitingPeriod";
        public const string COVERAGE_LIMIT = "CoverageRemaining";

        // ── Amount-based ────────────────────────────────────────────
        public const string AMOUNT_BELOW = "AmountBelow";
        public const string AMOUNT_ABOVE = "AmountAbove";
        public const string AMOUNT_BETWEEN = "AmountBetween";

        // ── Type / category ─────────────────────────────────────────
        public const string CLAIM_TYPE_DENY = "ClaimTypeDeny";
        public const string CLAIM_TYPE_PASS = "ClaimTypePass";

        // ── Fraud / duplicate ───────────────────────────────────────
        public const string DUPLICATE_CHECK = "DuplicateCheck";
        // REIMBURSEMENT_DUP removed — Reimbursement claim type no longer exists.

        // ── Financial adjustments ───────────────────────────────────
        public const string DEDUCTIBLE = "Deductible";
        public const string COPAY = "CoPay";

        // ── Document / routing ──────────────────────────────────────
        public const string REQUIRE_DOC_TYPE = "RequireDocType";
        public const string ROUTE_TO_REVIEW = "RouteToReview";

        /// <summary>Full list for UI dropdowns.</summary>
        public static readonly IReadOnlyList<string> All = new[]
        {
            POLICY_ACTIVE, IN_NETWORK, WAITING_PERIOD, COVERAGE_LIMIT,
            AMOUNT_BELOW, AMOUNT_ABOVE, AMOUNT_BETWEEN,
            CLAIM_TYPE_DENY, CLAIM_TYPE_PASS,
            DUPLICATE_CHECK,
            DEDUCTIBLE, COPAY,
            REQUIRE_DOC_TYPE, ROUTE_TO_REVIEW,
        };
    }
}