using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Models;
namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<Policy> Policies { get; set; }
        public DbSet<Dependent> Dependents { get; set; }
        public DbSet<Hospital> Hospitals { get; set; }
        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<Claim> Claims { get; set; }
        public DbSet<ClaimDocument> ClaimDocuments { get; set; }
        public DbSet<ClaimStatusHistory> ClaimStatusHistories { get; set; }
        public DbSet<ClaimPayment> ClaimPayments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 1‑to‑1: User → Patient
            modelBuilder.Entity<User>()
                .HasOne(u => u.Patient)
                .WithOne(p => p.User)
                .HasForeignKey<Patient>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Patient → Policies
            modelBuilder.Entity<Policy>()
                .HasOne(p => p.Patient)
                .WithMany(pt => pt.Policies)
                .HasForeignKey(p => p.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Patient → Claims
            modelBuilder.Entity<Claim>()
                .HasOne(c => c.Patient)
                .WithMany(p => p.Claims)
                .HasForeignKey(c => c.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Policy → Claims
            modelBuilder.Entity<Claim>()
                .HasOne(c => c.Policy)
                .WithMany(p => p.Claims)
                .HasForeignKey(c => c.PolicyId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Hospital → Claims
            modelBuilder.Entity<Claim>()
                .HasOne(c => c.Hospital)
                .WithMany(h => h.Claims)
                .HasForeignKey(c => c.HospitalId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Doctor → Claims
            modelBuilder.Entity<Claim>()
                .HasOne(c => c.Doctor)
                .WithMany(d => d.Claims)
                .HasForeignKey(c => c.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            // 1‑to‑many: Claim → ClaimDocuments
            modelBuilder.Entity<ClaimDocument>()
                .HasOne(cd => cd.Claim)
                .WithMany(c => c.Documents)
                .HasForeignKey(cd => cd.ClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑many: Claim → StatusHistory
            modelBuilder.Entity<ClaimStatusHistory>()
                .HasOne(csh => csh.Claim)
                .WithMany(c => c.StatusHistory)
                .HasForeignKey(csh => csh.ClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1‑to‑one: Claim → ClaimPayment
            modelBuilder.Entity<ClaimPayment>()
                .HasOne(cp => cp.Claim)
                .WithOne(c => c.Payment)
                .HasForeignKey<ClaimPayment>(cp => cp.ClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            // Optionally index common query columns
            modelBuilder.Entity<Claim>()
                .HasIndex(c => c.Status);
            modelBuilder.Entity<Claim>()
                .HasIndex(c => c.PatientId);

            base.OnModelCreating(modelBuilder);
        }
    }
}
