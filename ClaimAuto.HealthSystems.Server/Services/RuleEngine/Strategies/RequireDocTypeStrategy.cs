using ClaimAuto.HealthSystems.Server.Model;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies
{
    /// <summary>Requires that specified document types be verified before claim can proceed.</summary>
    public class RequireDocTypeStrategy : IRuleStrategy
    {
        public string TemplateKey => RuleTemplate.REQUIRE_DOC_TYPE;

        public Task<RuleResult> EvaluateAsync(Rule rule, RuleContext ctx)
        {
            var p = RuleParamHelper.ParseOrDefault<RequireDocTypeParams>(
                rule.ConditionExpressionJSON);

            if (p.RequiredTypes.Count == 0)
                return Task.FromResult(new RuleResult { Outcome = "PASS" });

            var verifiedTypes = ctx.Documents
                .Where(d => d.Status == DocStatus.Verified)
                .Select(d => d.DocType.ToString())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missing = p.RequiredTypes.Where(req => !verifiedTypes.Contains(req)).ToList();

            if (missing.Count > 0)
            {
                return Task.FromResult(new RuleResult
                {
                    Outcome = "ROUTE",
                    Reason = $"Missing verified documents: {string.Join(", ", missing)}"
                });
            }

            return Task.FromResult(new RuleResult { Outcome = "PASS" });
        }
    }
}
