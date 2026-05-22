using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            await SeedKPIsAsync(context);
            await SeedDefaultRulesAsync(context);
        }

        private static async Task SeedKPIsAsync(ApplicationDbContext context)
        {
            if (!context.KPIs.Any())
            {
                context.KPIs.AddRange(
                    new KPI
                    {
                        Name = "Auto-Adjudication Rate",
                        Definition = "% of claims auto-processed without human review",
                        Target = 80.00m,
                        CurrentValue = 0.00m,
                        ReportingPeriod = "Monthly"
                    },
                    new KPI
                    {
                        Name = "Average TAT",
                        Definition = "Average claim turnaround time in hours",
                        Target = 4.00m,
                        CurrentValue = 0.00m,
                        ReportingPeriod = "Monthly"
                    },
                    new KPI
                    {
                        Name = "Denial Rate",
                        Definition = "% of claims denied",
                        Target = 10.00m,
                        CurrentValue = 0.00m,
                        ReportingPeriod = "Monthly"
                    },
                    new KPI
                    {
                        Name = "Fraud Flag Rate",
                        Definition = "% of claims flagged for fraud review",
                        Target = 5.00m,
                        CurrentValue = 0.00m,
                        ReportingPeriod = "Monthly"
                    }
                );
                await context.SaveChangesAsync();
            }
        }

        private static async Task SeedDefaultRulesAsync(ApplicationDbContext context)
        {
            var adminId = await context.Users
                .Where(u => u.Role == UserRole.Admin && u.Status == AccountStatus.Active)
                .Select(u => u.UserID)
                .FirstOrDefaultAsync();

            if (adminId == 0) return; // No admin yet — retry on next startup

            var now = DateTime.UtcNow;

            // All 7 system rules with correct priorities and definitions
            var systemRules = new List<Rule>
    {
        new Rule
        {
            Name                    = "Policy Active Check",
            Description             = "Verifies the policy is Active. Denies if Expired, Cancelled, or Suspended.",
            RuleType                = RuleType.Coverage,
            ConditionExpressionJSON = "{\"field\":\"PolicyStatus\",\"operator\":\"equals\",\"value\":\"Active\"}",
            ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"Deny\"}",
            Priority                = 1,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "In-Network Check",
            Description             = "Verifies the provider is in-network. Routes out-of-network claims to manual review.",
            RuleType                = RuleType.Coverage,
            ConditionExpressionJSON = "{\"field\":\"ProviderNetwork\",\"operator\":\"equals\",\"value\":\"InNetwork\"}",
            ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"PendingReview\"}",
            Priority                = 2,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "Duplicate Detection",
            Description             = "Denies if the same member and provider submitted a non-rejected claim within 7 days.",
            RuleType                = RuleType.Validation,
            ConditionExpressionJSON = "{\"field\":\"DuplicateWindow\",\"operator\":\"days\",\"value\":\"7\"}",
            ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"Deny\"}",
            Priority                = 3,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "Reimbursement Duplicate Check",
            Description             = "Denies a reimbursement if the same member already has an active hospital claim in the last 7 days — prevents double payment for the same episode.",
            RuleType                = RuleType.Validation,
            ConditionExpressionJSON = "{\"field\":\"ClaimType\",\"operator\":\"equals\",\"value\":\"Reimbursement\"}",
            ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"Deny\"}",
            Priority                = 4,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "Coverage Remaining Check",
            Description             = "Checks remaining policy coverage (sum insured minus all prior payments). Denies if exhausted; routes to manual review if claim exceeds what remains.",
            RuleType                = RuleType.Coverage,
            ConditionExpressionJSON = "{\"field\":\"SumInsured\",\"operator\":\"greaterThan\",\"value\":0}",
            ActionExpressionJSON    = "{\"onExhausted\":\"Deny\",\"onExceeds\":\"PendingReview\",\"onPass\":\"Continue\"}",
            Priority                = 5,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "Amount Threshold",
            Description             = "Routes claims exceeding ₹5,00,000 to manual review.",
            RuleType                = RuleType.Validation,
            ConditionExpressionJSON = "{\"field\":\"ClaimAmount\",\"operator\":\"lessThanOrEqual\",\"value\":500000}",
            ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"PendingReview\"}",
            Priority                = 6,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        },
        new Rule
        {
            Name                    = "Deductible Applied",
            Description             = "Applies the member's annual deductible to the payable amount and computes net payable.",
            RuleType                = RuleType.Payment,
            ConditionExpressionJSON = "{\"field\":\"DeductibleBalance\",\"operator\":\"greaterThan\",\"value\":0}",
            ActionExpressionJSON    = "{\"onPass\":\"ApplyDeductible\",\"onFail\":\"FullPayment\"}",
            Priority                = 7,
            Status                  = RuleStatus.Active,
            CreatedBy               = adminId,
            OrganizationID          = null,
            CreatedAt               = now
        }
    };

            bool changed = false;

            foreach (var def in systemRules)
            {
                var existing = await context.Rules
                    .FirstOrDefaultAsync(r => r.Name == def.Name);

                if (existing == null)
                {
                    // Rule doesn't exist — insert it
                    context.Rules.Add(def);
                    changed = true;
                }
                else if (existing.Priority != def.Priority)
                {
                    // Rule exists but priority is wrong (e.g. from old seeder) — fix it
                    existing.Priority = def.Priority;
                    changed = true;
                }
            }

            if (changed)
                await context.SaveChangesAsync();
        }
    }
}