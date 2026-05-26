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

            await SeedDefaultKPIsForAllOrgsAsync(context);
            await SeedDefaultRulesForAllOrgsAsync(context);
        }

        // ── Called at startup: seeds rules for every org that has none ──────
        public static async Task SeedDefaultRulesForAllOrgsAsync(ApplicationDbContext context)
        {
            var organizations = await context.Organizations.ToListAsync();

            foreach (var org in organizations)
                await SeedDefaultRulesForOrgAsync(context, org.OrganizationID);
        }

        // ── Called when a NEW org is created — seeds its default ruleset ────
        public static async Task SeedDefaultRulesForOrgAsync(
            ApplicationDbContext context, int orgId)
        {
            // Already has rules — skip
            var hasRules = await context.Rules
                .AnyAsync(r => r.OrganizationID == orgId);
            if (hasRules) return;

            // Prefer this org's own Admin; fall back to any active Admin
            var adminId = await context.Users
                .Where(u => u.OrganizationID == orgId
                         && u.Role == UserRole.Admin
                         && u.Status == AccountStatus.Active)
                .Select(u => u.UserID)
                .FirstOrDefaultAsync();

            if (adminId == 0)
                adminId = await context.Users
                    .Where(u => u.Role == UserRole.Admin
                             && u.Status == AccountStatus.Active)
                    .Select(u => u.UserID)
                    .FirstOrDefaultAsync();

            if (adminId == 0) return; // No admin at all — retry on next startup

            context.Rules.AddRange(GetDefaultRules(adminId, orgId, DateTime.UtcNow));
            await context.SaveChangesAsync();
        }

        // ── The 7 standard rules — always created per org ───────────────────
        public static List<Rule> GetDefaultRules(int adminId, int orgId, DateTime now)
        {
            return new List<Rule>
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
                    OrganizationID          = orgId,
                    CreatedAt               = now,
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
                    OrganizationID          = orgId,
                    CreatedAt               = now,
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
                    OrganizationID          = orgId,
                    CreatedAt               = now,
                },
                new Rule
                {
                    Name                    = "Reimbursement Duplicate Check",
                    Description             = "Denies a reimbursement if the same member already has an active hospital claim in the last 7 days.",
                    RuleType                = RuleType.Validation,
                    ConditionExpressionJSON = "{\"field\":\"ClaimType\",\"operator\":\"equals\",\"value\":\"Reimbursement\"}",
                    ActionExpressionJSON    = "{\"onPass\":\"Continue\",\"onFail\":\"Deny\"}",
                    Priority                = 4,
                    Status                  = RuleStatus.Active,
                    CreatedBy               = adminId,
                    OrganizationID          = orgId,
                    CreatedAt               = now,
                },
                new Rule
                {
                    Name                    = "Coverage Remaining Check",
                    Description             = "Checks remaining policy coverage. Denies if exhausted; routes to manual review if claim exceeds what remains.",
                    RuleType                = RuleType.Coverage,
                    ConditionExpressionJSON = "{\"field\":\"SumInsured\",\"operator\":\"greaterThan\",\"value\":0}",
                    ActionExpressionJSON    = "{\"onExhausted\":\"Deny\",\"onExceeds\":\"PendingReview\",\"onPass\":\"Continue\"}",
                    Priority                = 5,
                    Status                  = RuleStatus.Active,
                    CreatedBy               = adminId,
                    OrganizationID          = orgId,
                    CreatedAt               = now,
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
                    OrganizationID          = orgId,
                    CreatedAt               = now,
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
                    OrganizationID          = orgId,
                    CreatedAt               = now,
                },
            };
        }

        // ── Called at startup: seeds KPIs for every org that has none ─────────
        public static async Task SeedDefaultKPIsForAllOrgsAsync(ApplicationDbContext context)
        {
            var organizations = await context.Organizations.ToListAsync();
            foreach (var org in organizations)
                await SeedDefaultKPIsForOrgAsync(context, org.OrganizationID);
        }

        // ── Called when a NEW org is created — seeds its default KPI set ──────
        public static async Task SeedDefaultKPIsForOrgAsync(
            ApplicationDbContext context, int orgId)
        {
            var hasKPIs = await context.KPIs.AnyAsync(k => k.OrganizationID == orgId);
            if (hasKPIs) return;

            context.KPIs.AddRange(
                new KPI { Name = "Auto-Adjudication Rate", Definition = "% of claims auto-processed without human review", Target = 80.00m, CurrentValue = 0.00m, ReportingPeriod = "Monthly", OrganizationID = orgId },
                new KPI { Name = "Average TAT", Definition = "Average claim turnaround time in hours", Target = 4.00m, CurrentValue = 0.00m, ReportingPeriod = "Monthly", OrganizationID = orgId },
                new KPI { Name = "Denial Rate", Definition = "% of claims denied", Target = 10.00m, CurrentValue = 0.00m, ReportingPeriod = "Monthly", OrganizationID = orgId },
                new KPI { Name = "Fraud Flag Rate", Definition = "% of claims flagged for fraud review", Target = 5.00m, CurrentValue = 0.00m, ReportingPeriod = "Monthly", OrganizationID = orgId }
            );
            await context.SaveChangesAsync();
        }
    }
}