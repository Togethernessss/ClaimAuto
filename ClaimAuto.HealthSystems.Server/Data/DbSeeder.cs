using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(
            WebApplication app)
        {
            using var scope = app.Services
                .CreateScope();

            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            await SeedKPIsAsync(context);
        }

        private static async Task SeedKPIsAsync(
            ApplicationDbContext context)
        {
            // Only seed if KPIs table is empty
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
    }
}