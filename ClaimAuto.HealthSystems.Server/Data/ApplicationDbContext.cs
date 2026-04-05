using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        // Module 1
        public DbSet<User> Users { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        // Module 2
        public DbSet<Claim> Claims { get; set; }
        public DbSet<ClaimLine> ClaimLines { get; set; }
        public DbSet<ClaimDocument> ClaimDocuments { get; set; }

        // Module 3
        public DbSet<Member> Members { get; set; }
        public DbSet<Policy> Policies { get; set; }
        public DbSet<EligibilityCheck> EligibilityChecks { get; set; }

        // Module 4
        public DbSet<Rule> Rules { get; set; }
        public DbSet<AdjudicationRecord> AdjudicationRecords { get; set; }

        // Module 5
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Remittance> Remittances { get; set; }
        public DbSet<Reconciliation> Reconciliations { get; set; }

        // Module 6
        public DbSet<FraudScore> FraudScores { get; set; }
        public DbSet<FraudCase> FraudCases { get; set; }

        // Module 7
        public DbSet<Appeal> Appeals { get; set; }
        public DbSet<Subrogation> Subrogations { get; set; }

        // Module 8
        public DbSet<Report> Reports { get; set; }
        public DbSet<KPI> KPIs { get; set; }
        public DbSet<AuditPackage> AuditPackages { get; set; }

        // Module 9
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Tasks> Tasks { get; set; }

        protected override void OnModelCreating(ModelBuilder mb)
        {
            base.OnModelCreating(mb);

            // ── Unique Constraints ──────────────────────────
            mb.Entity<User>()
                .HasIndex(u => u.Email).IsUnique();

            mb.Entity<Claim>()
                .HasIndex(c => c.ExternalClaimRef).IsUnique();

            mb.Entity<Member>()
                .HasIndex(m => m.MemberNumber).IsUnique();

            mb.Entity<Policy>()
                .HasIndex(p => p.PlanCode).IsUnique();

            mb.Entity<Payment>()
                .HasIndex(p => p.ReferenceNumber).IsUnique();

            // ── Performance Indexes ─────────────────────────
            mb.Entity<Claim>()
                .HasIndex(c => new { c.Status, c.SubmittedAt });

            mb.Entity<Claim>()
                .HasIndex(c => new { c.ProviderID, c.ReceivedAt });

            mb.Entity<Claim>()
                .HasIndex(c => new { c.MemberID, c.PolicyID });

            // ── Claim → multiple Users (avoid cascade cycles) ──
            mb.Entity<Claim>()
                .HasOne(c => c.Provider)
                .WithMany()
                .HasForeignKey(c => c.ProviderID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<ClaimDocument>()
                .HasOne(d => d.Uploader)
                .WithMany()
                .HasForeignKey(d => d.UploadedBy)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<ClaimDocument>()
                .HasOne(d => d.VerifiedBy)
                .WithMany()
                .HasForeignKey(d => d.VerifiedByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<AdjudicationRecord>()
                .HasOne(a => a.PerformedBy)
                .WithMany()
                .HasForeignKey(a => a.PerformedByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Appeal>()
                .HasOne(a => a.DecisionBy)
                .WithMany()
                .HasForeignKey(a => a.DecisionByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<EligibilityCheck>()
                .HasOne(e => e.PerformedBy)
                .WithMany()
                .HasForeignKey(e => e.PerformedByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Reconciliation>()
                .HasOne(r => r.PerformedBy)
                .WithMany()
                .HasForeignKey(r => r.PerformedByID)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Remittance 1-to-1 with Payment ─────────────
            mb.Entity<Remittance>()
                .HasOne(r => r.Payment)
                .WithOne(p => p.Remittance)
                .HasForeignKey<Remittance>(r => r.PaymentID);

            // ── Enum → string storage (readable columns) ───
            mb.Entity<User>().Property(u => u.Role).HasConversion<string>();
            mb.Entity<User>().Property(u => u.Status).HasConversion<string>();
            mb.Entity<Claim>().Property(c => c.ClaimType).HasConversion<string>();
            mb.Entity<Claim>().Property(c => c.Status).HasConversion<string>();
            mb.Entity<Claim>().Property(c => c.Priority).HasConversion<string>();
            mb.Entity<Claim>().Property(c => c.SourceChannel).HasConversion<string>();
            mb.Entity<ClaimLine>().Property(l => l.LineStatus).HasConversion<string>();
            mb.Entity<ClaimDocument>().Property(d => d.DocType).HasConversion<string>();
            mb.Entity<ClaimDocument>().Property(d => d.Status).HasConversion<string>();
            mb.Entity<Member>().Property(m => m.Gender).HasConversion<string>();
            mb.Entity<Member>().Property(m => m.Status).HasConversion<string>();
            mb.Entity<Policy>().Property(p => p.Status).HasConversion<string>();
            mb.Entity<Rule>().Property(r => r.RuleType).HasConversion<string>();
            mb.Entity<Rule>().Property(r => r.Status).HasConversion<string>();
            mb.Entity<AdjudicationRecord>().Property(a => a.Decision).HasConversion<string>();
            mb.Entity<Payment>().Property(p => p.PaymentMethod).HasConversion<string>();
            mb.Entity<Payment>().Property(p => p.Status).HasConversion<string>();
            mb.Entity<Remittance>().Property(r => r.Status).HasConversion<string>();
            mb.Entity<FraudCase>().Property(f => f.Priority).HasConversion<string>();
            mb.Entity<FraudCase>().Property(f => f.Status).HasConversion<string>();
            mb.Entity<FraudCase>().Property(f => f.Outcome).HasConversion<string>();
            mb.Entity<Appeal>().Property(a => a.Status).HasConversion<string>();
            mb.Entity<Appeal>().Property(a => a.Outcome).HasConversion<string>();
            mb.Entity<Subrogation>().Property(s => s.Status).HasConversion<string>();
            mb.Entity<Report>().Property(r => r.Scope).HasConversion<string>();
            mb.Entity<Notification>().Property(n => n.Category).HasConversion<string>();
            mb.Entity<Notification>().Property(n => n.Severity).HasConversion<string>();
            mb.Entity<Notification>().Property(n => n.Status).HasConversion<string>();
            mb.Entity<Tasks>().Property(t => t.Priority).HasConversion<string>();
            mb.Entity<Tasks>().Property(t => t.Status).HasConversion<string>();
        }
    }
}