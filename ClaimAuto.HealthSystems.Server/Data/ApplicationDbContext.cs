using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        // Module 1 — Identity & Access Management
        public DbSet<User> Users { get; set; }
        public DbSet<Organization> Organizations { get; set; }   // ← NEW: multi-tenant
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        // Module 2
        public DbSet<Claim> Claims { get; set; }
        public DbSet<ClaimLine> ClaimLines { get; set; }
        public DbSet<ClaimDocument> ClaimDocuments { get; set; }
        public DbSet<ClaimDocumentContent> ClaimDocumentContents { get; set; }

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
        public DbSet<AppealDocument> AppealDocuments { get; set; }
        public DbSet<Subrogation> Subrogations { get; set; }

        // Module 8
        public DbSet<Report> Reports { get; set; }
        public DbSet<KPI> KPIs { get; set; }
        public DbSet<AuditPackage> AuditPackages { get; set; }

        // Module 9
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ClaimTasks> ClaimTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder mb)
        {
            base.OnModelCreating(mb);

            // ── Unique Constraints ───────────────────────────────────────────

            mb.Entity<User>()
                .HasIndex(u => u.Email).IsUnique();

            // ── Organization: unique ShortCode + User-Organization relationship ──
            mb.Entity<Organization>()
                .HasIndex(o => o.ShortCode).IsUnique();

            mb.Entity<User>()
    .HasOne(u => u.Organization)
    .WithMany(o => o.Users)
    .HasForeignKey(u => u.OrganizationID)
    .IsRequired(false)
    .OnDelete(DeleteBehavior.Restrict);

            // ─── Multi-Tenant Phase 1: 5 core entities ────────────────────
            // Each operational entity has an optional Organization link.
            // DeleteBehavior.Restrict prevents accidentally deleting an
            // Organization while it still owns claims/policies/etc.
            mb.Entity<Claim>()
                .HasOne(c => c.Organization)
                .WithMany()
                .HasForeignKey(c => c.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Member>()
                .HasOne(m => m.Organization)
                .WithMany()
                .HasForeignKey(m => m.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Policy>()
                .HasOne(p => p.Organization)
                .WithMany()
                .HasForeignKey(p => p.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Payment>()
                .HasOne(p => p.Organization)
                .WithMany()
                .HasForeignKey(p => p.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Appeal>()
                .HasOne(a => a.Organization)
                .WithMany()
                .HasForeignKey(a => a.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // ── AppealDocument: belongs to one Appeal, cascade-delete with appeal ──
            mb.Entity<AppealDocument>()
                .HasOne(d => d.Appeal)
                .WithMany()
                .HasForeignKey(d => d.AppealID)
                .OnDelete(DeleteBehavior.Cascade);

            mb.Entity<AppealDocument>()
                .HasOne(d => d.Organization)
                .WithMany()
                .HasForeignKey(d => d.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // Force varbinary(max) so large PDFs / images fit
            mb.Entity<AppealDocument>()
                .Property(d => d.FileData)
                .HasColumnType("varbinary(max)");

            mb.Entity<Notification>()
    .HasOne(n => n.Organization)
    .WithMany()
    .HasForeignKey(n => n.OrganizationID)
    .IsRequired(false)
    .OnDelete(DeleteBehavior.Restrict);

            // ── Multi-Tenant FK configs added in Phase 4.1 (post-merge) ──
            mb.Entity<ClaimLine>()
                .HasOne(cl => cl.Organization)
                .WithMany()
                .HasForeignKey(cl => cl.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<ClaimDocument>()
                .HasOne(cd => cd.Organization)
                .WithMany()
                .HasForeignKey(cd => cd.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Remittance>()
                .HasOne(r => r.Organization)
                .WithMany()
                .HasForeignKey(r => r.OrganizationID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // ─── Multi-Tenant Phase 2: 11 secondary entities ─────────────
            mb.Entity<FraudCase>()
                .HasOne(f => f.Organization).WithMany().HasForeignKey(f => f.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<FraudScore>()
                .HasOne(f => f.Organization).WithMany().HasForeignKey(f => f.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<ClaimTasks>()
                .HasOne(t => t.Organization).WithMany().HasForeignKey(t => t.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<AdjudicationRecord>()
                .HasOne(a => a.Organization).WithMany().HasForeignKey(a => a.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Subrogation>()
                .HasOne(s => s.Organization).WithMany().HasForeignKey(s => s.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<EligibilityCheck>()
                .HasOne(e => e.Organization).WithMany().HasForeignKey(e => e.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Reconciliation>()
                .HasOne(r => r.Organization).WithMany().HasForeignKey(r => r.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Report>()
                .HasOne(r => r.Organization).WithMany().HasForeignKey(r => r.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<AuditPackage>()
                .HasOne(p => p.GeneratedByUser).WithMany().HasForeignKey(p => p.GeneratedByID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<KPI>()
                .HasOne(k => k.Organization).WithMany().HasForeignKey(k => k.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<AuditPackage>()
                .HasOne(p => p.Organization).WithMany().HasForeignKey(p => p.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<AuditLog>()
     .HasOne(l => l.Organization).WithMany().HasForeignKey(l => l.OrganizationID)
     .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Rule>()
                .HasOne(r => r.Organization).WithMany().HasForeignKey(r => r.OrganizationID)
                .IsRequired(false).OnDelete(DeleteBehavior.Restrict);

            // ── FIX: allow multiple NULL ExternalClaimRef values ─────────────
            // ExternalClaimRef is optional. Policyholders (reimbursement flow)
            // and some hospitals never supply one, so it is frequently NULL.
            // Without HasFilter, SQL Server treats two NULLs as duplicates and
            // throws a unique key violation on the second claim with no ref.
            // HasFilter("[ExternalClaimRef] IS NOT NULL") tells SQL Server to
            // only enforce uniqueness for rows where a value IS provided —
            // exactly the same fix already applied to Payment.ReferenceNumber.
            mb.Entity<Claim>()
                .HasIndex(c => c.ExternalClaimRef)
                .IsUnique()
                .HasFilter("[ExternalClaimRef] IS NOT NULL");

            mb.Entity<Member>()
                .HasIndex(m => m.MemberNumber)
                .HasFilter("[MemberNumber] IS NOT NULL");

            mb.Entity<Policy>()
                .HasIndex(p => p.PlanCode).IsUnique();

            // ── FIX: allow multiple NULL reference numbers ───────────────────
            // ReferenceNumber is null until payment is executed.
            // Without HasFilter, SQL Server treats two NULLs as duplicates
            // and throws 409 Conflict when creating a second payment.
            mb.Entity<Payment>()
                .HasIndex(p => p.ReferenceNumber)
                .IsUnique()
                .HasFilter("[ReferenceNumber] IS NOT NULL");

            // ── Performance Indexes ──────────────────────────────────────────

            mb.Entity<Claim>()
                .HasIndex(c => new { c.Status, c.SubmittedAt });

            mb.Entity<Claim>()
                .HasIndex(c => new { c.ProviderID, c.ReceivedAt });

            mb.Entity<Claim>()
                .HasIndex(c => new { c.MemberID, c.PolicyID });

            // ── PasswordResetToken ───────────────────────────────────────────

            mb.Entity<PasswordResetToken>()
                .HasIndex(t => t.TokenHash)
                .IsUnique();

            mb.Entity<PasswordResetToken>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserID)
                .OnDelete(DeleteBehavior.Cascade);

            // ── FK Restrict — avoid cascade cycles ──────────────────────────

            mb.Entity<Claim>()
                .HasOne(c => c.Provider)
                .WithMany()
                .HasForeignKey(c => c.ProviderID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Claim>()
                .HasOne(c => c.Policy)
                .WithMany(p => p.Claims)
                .HasForeignKey(c => c.PolicyID)
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

            mb.Entity<Appeal>()
                .HasOne(a => a.FiledByUser)
                .WithMany()
                .HasForeignKey(a => a.FiledBy)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<EligibilityCheck>()
                .HasOne(e => e.Policy)
                .WithMany(p => p.EligibilityChecks)
                .HasForeignKey(e => e.PolicyID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<EligibilityCheck>()
                .HasOne(e => e.PerformedBy)
                .WithMany()
                .HasForeignKey(e => e.PerformedByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Member>()
                .HasOne(m => m.PolicyholderUser)
                .WithMany()
                .HasForeignKey(m => m.PolicyholderUserID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Reconciliation>()
                .HasOne(r => r.PerformedBy)
                .WithMany()
                .HasForeignKey(r => r.PerformedByID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<FraudCase>()
                .HasOne(f => f.OpenedByUser)
                .WithMany()
                .HasForeignKey(f => f.OpenedBy)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Payment>()
                .HasOne(p => p.Payee)
                .WithMany()
                .HasForeignKey(p => p.PayeeID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserID)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Notification>()
                .HasOne(n => n.Claim)
                .WithMany(c => c.Notifications)
                .HasForeignKey(n => n.ClaimID)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<ClaimTasks>()
                .HasOne(t => t.AssignedToUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedTo)
                .OnDelete(DeleteBehavior.Restrict);

            mb.Entity<Report>()
                .HasOne(r => r.GeneratedByUser)
                .WithMany()
                .HasForeignKey(r => r.GeneratedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Remittance 1-to-1 with Payment ──────────────────────────────

            mb.Entity<Remittance>()
                .HasOne(r => r.Payment)
                .WithOne(p => p.Remittance)
                .HasForeignKey<Remittance>(r => r.PaymentID);

            // ── Enum → string storage ────────────────────────────────────────

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
            mb.Entity<ClaimTasks>().Property(t => t.Priority).HasConversion<string>();
            mb.Entity<ClaimTasks>().Property(t => t.Status).HasConversion<string>();
        }
    }
}
