using ClaimAuto.HealthSystems.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        { }
        public DbSet<UserTable> Users { get; set; }
        public DbSet<PolicyTable> Policies { get; set; }
        public DbSet<ClaimTable> Claims { get; set; }
        public DbSet<UserPolicyTable> UserPolicies { get; set; }
        public DbSet<ProviderTable> Providers { get; set; }
        public DbSet<ClaimPolicyTable> ClaimPolicies { get; set; }
        public DbSet<AutomationRuleTable> AutomationRules { get; set; }
    }
}
