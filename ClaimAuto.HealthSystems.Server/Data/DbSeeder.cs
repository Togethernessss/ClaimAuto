using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.RuleEngine;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider
                .GetRequiredService<ILoggerFactory>()
                .CreateLogger("DbSeeder");

            try
            {
                logger.LogInformation("[DbSeeder] Starting startup seed…");

                // CRITICAL: run FIRST — converts legacy integer-as-string enum rows
                // ('0','1','2') to named values ('Admin','Active', etc.) so all
                // subsequent queries that filter by enum name work correctly.
                await MigrateLegacyEnumValuesAsync(context, logger);

                // ── Bootstrap check ──────────────────────────────────────────
                // If no organizations exist this is a fresh install.
                // We cannot seed rules yet (rules.CreatedBy requires a valid UserID).
                // Guide the developer to the setup endpoint instead.
                var orgCount = await context.Organizations.CountAsync();
                if (orgCount == 0)
                {
                    logger.LogWarning(
                        "[DbSeeder] ⚠  No organizations found — this looks like a fresh installation.\n" +
                        "           → Step 1: POST /api/setup/create-org   (X-Setup-Key header required)\n" +
                        "                     Creates the organization. Returns organizationID.\n" +
                        "           → Step 2: POST /api/setup/create-admin (X-Setup-Key header required)\n" +
                        "                     Creates the admin for that org. Seeds rules + KPIs.\n" +
                        "           → The key is in appsettings.Development.json → Setup:SecretKey.");
                    logger.LogInformation("[DbSeeder] Startup seed skipped (no orgs). Waiting for setup.");
                    return;
                }

                // ── Normal path: seed KPIs and rules for every existing org ──
                await SeedDefaultKPIsForAllOrgsAsync(context);
                await SeedDefaultRulesForAllOrgsAsync(context, logger);

                logger.LogInformation("[DbSeeder] Startup seed complete.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[DbSeeder] Seeding failed: {Message}", ex.Message);
                throw;
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Self-healing migration for legacy integer-as-string enum values.
        //
        // History: Users.Role / Users.Status (and historically Rules.RuleType)
        // were originally `int` columns. A later migration changed the column
        // type to `nvarchar` and the code switched to `HasConversion<string>()`,
        // expecting values like "Admin"/"Active". But SQL Server's ALTER COLUMN
        // converted existing rows from `0` → `'0'`, NOT to `'Admin'`. This
        // breaks any query that filters by enum NAME (e.g. the rule seeder's
        // `WHERE Role = 'Admin' AND Status = 'Active'`).
        //
        // This routine runs on every startup and is fully idempotent — the
        // WHERE clauses only match legacy rows, so on a clean DB it's a no-op.
        // New code paths that insert via EF already write proper enum names.
        // ────────────────────────────────────────────────────────────────────
        public static async Task MigrateLegacyEnumValuesAsync(
            ApplicationDbContext context, ILogger? logger = null)
        {
            // NOTE: curly braces are escaped as {{ }} because ExecuteSqlRawAsync
            // uses String.Format-style parsing on the SQL string and would
            // otherwise treat {Admin} etc. as a malformed parameter placeholder.
            const string sql = @"
                -- Users.Role: UserRole values are Admin, InsuranceStaff, Policyholder, Hospital
                UPDATE Users SET Role = 'Admin'          WHERE Role = '0';
                UPDATE Users SET Role = 'InsuranceStaff' WHERE Role = '1';
                UPDATE Users SET Role = 'Policyholder'   WHERE Role = '2';
                UPDATE Users SET Role = 'Hospital'       WHERE Role = '3';

                -- Users.Status: AccountStatus values are Active, Inactive
                UPDATE Users SET Status = 'Active'   WHERE Status = '0';
                UPDATE Users SET Status = 'Inactive' WHERE Status = '1';

                -- Rules.RuleType: old enum values Coverage, Payment, Validation
                -- or their int-as-string form '0','1','2'. The new engine
                -- dispatches by template KEY (PolicyActive, AmountAbove, etc.)
                -- so any legacy value is dead. Map to RouteToReview + Inactive
                -- so the rule survives in audit history but can't auto-decide
                -- anything until an admin reconfigures it.
                UPDATE Rules
                SET RuleType    = 'RouteToReview',
                    Status      = 'Inactive',
                    Description = ISNULL(Description, '') + ' [LEGACY - please reconfigure to a valid template]'
                WHERE RuleType IN ('0','1','2','Coverage','Payment','Validation');
            ";

            var rowsAffected = await context.Database.ExecuteSqlRawAsync(sql);
            if (rowsAffected > 0)
                logger?.LogInformation("[DbSeeder] Migrated {Count} legacy enum int-string rows.", rowsAffected);
            else
                logger?.LogInformation("[DbSeeder] No legacy enum rows to migrate (DB is clean).");
        }

        // ── Called at startup: seeds rules for every org that has none ──────
        public static async Task SeedDefaultRulesForAllOrgsAsync(
            ApplicationDbContext context, ILogger? logger = null)
        {
            var organizations = await context.Organizations.ToListAsync();
            logger?.LogInformation("[DbSeeder] Checking rule seed for {Count} orgs.", organizations.Count);

            foreach (var org in organizations)
                await SeedDefaultRulesForOrgAsync(context, org.OrganizationID, logger);
        }

        // ── Called when a NEW org is created — seeds its default ruleset ────
        public static async Task SeedDefaultRulesForOrgAsync(
            ApplicationDbContext context, int orgId, ILogger? logger = null)
        {
            // Already has rules — skip
            var hasRules = await context.Rules
                .AnyAsync(r => r.OrganizationID == orgId);
            if (hasRules)
            {
                logger?.LogInformation("[DbSeeder] Org {OrgId}: already has rules — skipped.", orgId);
                return;
            }

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

            if (adminId == 0)
            {
                logger?.LogWarning(
                    "[DbSeeder] Org {OrgId}: no active Admin user found — default rules cannot be seeded.\n" +
                    "           → Fix: call POST /api/setup/create-admin with this OrgId.\n" +
                    "             Rules and KPIs will be seeded automatically at that point.",
                    orgId);
                return;
            }

            var rules = GetDefaultRules(adminId, orgId, DateTime.UtcNow);
            context.Rules.AddRange(rules);
            await context.SaveChangesAsync();
            logger?.LogInformation("[DbSeeder] Org {OrgId}: seeded {Count} default rules (admin={AdminId}).",
                orgId, rules.Count, adminId);
        }

        // ── The 7 standard rules — always created per org ───────────────────
        // RuleType now stores the TEMPLATE KEY from RuleTemplate constants.
        // ConditionExpressionJSON holds the strongly-typed parameter object.
        // ActionExpressionJSON holds the standard RuleAction (decision + reason).
        public static List<Rule> GetDefaultRules(int adminId, int orgId, DateTime now)
        {
            return new List<Rule>
            {
                new Rule
                {
                    Name                    = "Policy Active Check",
                    Description             = "Verifies the policy is Active. Denies if Expired, Cancelled, or Suspended.",
                    RuleType                = RuleTemplate.POLICY_ACTIVE,
                    ConditionExpressionJSON = "{}",
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "Denied",
                        Reason   = "Policy must be Active"
                    }),
                    Priority                = 1,
                    Status                  = RuleStatus.Active,
                    CreatedBy               = adminId,
                    OrganizationID          = orgId,
                    CreatedAt               = now,
                },
                new Rule
                {
                    Name                    = "In-Network Check",
                    Description             = "Verifies the provider is in-network. Rejects out-of-network claims (reimbursement claims excluded).",
                    RuleType                = RuleTemplate.IN_NETWORK,
                    ConditionExpressionJSON = "{}",
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "Denied",
                        Reason   = "Provider is not in-network"
                    }),
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
                    RuleType                = RuleTemplate.DUPLICATE_CHECK,
                    ConditionExpressionJSON = JsonSerializer.Serialize(new DuplicateCheckParams { WindowDays = 7 }),
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "Denied",
                        Reason   = "Duplicate claim detected"
                    }),
                    Priority                = 3,
                    Status                  = RuleStatus.Active,
                    CreatedBy               = adminId,
                    OrganizationID          = orgId,
                    CreatedAt               = now,
                },
                // "Reimbursement Duplicate Check" rule removed — Reimbursement claim type no longer exists.
                new Rule
                {
                    Name                    = "Coverage Remaining Check",
                    Description             = "Checks remaining policy coverage. Denies if exhausted; routes to manual review if claim exceeds what remains.",
                    RuleType                = RuleTemplate.COVERAGE_LIMIT,
                    ConditionExpressionJSON = "{}",
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "Denied",
                        Reason   = "Policy coverage exhausted"
                    }),
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
                    RuleType                = RuleTemplate.AMOUNT_ABOVE,
                    ConditionExpressionJSON = JsonSerializer.Serialize(new AmountThresholdParams { MinAmount = 500000m }),
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "PendingReview",
                        Reason   = "High-value claim — manual review required"
                    }),
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
                    RuleType                = RuleTemplate.DEDUCTIBLE,
                    ConditionExpressionJSON = "{}",
                    ActionExpressionJSON    = JsonSerializer.Serialize(new RuleAction
                    {
                        Decision = "Continue",
                        Reason   = "Deductible applied to payable amount"
                    }),
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